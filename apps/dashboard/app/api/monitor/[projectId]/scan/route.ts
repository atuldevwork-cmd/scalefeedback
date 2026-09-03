import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';
import { crawlWebsite } from '@/lib/crawler';
import {
  extractFindings, extractSeoFindings, extractLegalFindings,
  extractContentQualityFindings, extractBrandConsistencyFindings, extractCustomCheckFindings,
  computeAccessibilityScore, wcagTagsForLevel, worsePriority, type MonitorFinding,
} from '@/lib/monitor';
import { planAtLeast } from '@/lib/plan';
import type { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface ScanBody {
  target_url?: string;
  wcag_level?: 'A' | 'AA' | 'AAA';
  max_pages?: number;
  interested_check?: string;
  custom_check_prompt?: string;
}

// Legacy monitors that pre-date the "Which additional checks" gating (their
// interested_check is null because they were set up before this checkbox
// existed) keep running exactly the 4 checks that always ran unconditionally
// — no surprise new AI spend on a rescan they didn't opt into.
const DEFAULT_ENABLED_CHECKS = ['broken_links', 'accessibility', 'seo', 'legal'];
const LEGACY_CATEGORIES = new Set(DEFAULT_ENABLED_CHECKS);

function parseEnabledChecks(interestedCheck: string | null | undefined): Set<string> {
  if (!interestedCheck) return new Set(DEFAULT_ENABLED_CHECKS);
  return new Set(interestedCheck.split(',').map((s) => s.trim()).filter(Boolean));
}

async function uploadScreenshot(
  service: ReturnType<typeof createServiceClient>,
  projectId: string,
  buffer: Buffer,
  index: number
): Promise<string | null> {
  const fileName = `${projectId}/monitor-${Date.now()}-${index}.png`;
  const { data, error } = await service.storage
    .from('screenshots')
    .upload(fileName, buffer, { contentType: 'image/png', upsert: false });
  if (error || !data) {
    console.error('[monitor-scan] Screenshot upload failed:', JSON.stringify(error));
    return null;
  }
  return data.path;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const auth = await requireProjectAccess(projectId);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { service, role, plan } = auth;

    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Only admins and owners can run a scan.' }, { status: 403 });
    }
    if (!planAtLeast(plan, 'agency')) {
      return NextResponse.json({ error: 'Website Monitoring is available on the Agency plan.' }, { status: 403 });
    }

    const body: ScanBody = await request.json().catch(() => ({}));

    const { data: existingMonitor } = await service
      .from('project_monitors')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (!existingMonitor && !body.target_url) {
      return NextResponse.json({ error: 'target_url is required to set up monitoring.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.target_url ?? existingMonitor.target_url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL — must include http:// or https://' }, { status: 400 });
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });
    }

    const wcagLevel = body.wcag_level ?? existingMonitor?.wcag_level ?? 'AA';
    const maxPages = Math.min(Math.max(1, body.max_pages ?? existingMonitor?.max_pages ?? 10), 30);
    const enabledChecks = parseEnabledChecks(body.interested_check ?? existingMonitor?.interested_check);
    const customCheckPrompt = body.custom_check_prompt ?? existingMonitor?.custom_check_prompt ?? '';

    let { data: monitor, error: monitorError } = await service
      .from('project_monitors')
      .upsert(
        {
          project_id: projectId,
          target_url: parsedUrl.toString(),
          wcag_level: wcagLevel,
          max_pages: maxPages,
          updated_at: new Date().toISOString(),
          // Only include if provided — omitting it on a plain rescan leaves the
          // previously-saved value alone instead of clobbering it with null.
          ...(body.interested_check !== undefined ? { interested_check: body.interested_check } : {}),
          ...(body.custom_check_prompt !== undefined ? { custom_check_prompt: body.custom_check_prompt } : {}),
        },
        { onConflict: 'project_id' }
      )
      .select()
      .single();

    // PGRST204 = column not found in schema cache (e.g. migration 032 not applied yet)
    if (monitorError && (monitorError as { code?: string }).code === 'PGRST204') {
      ({ data: monitor, error: monitorError } = await service
        .from('project_monitors')
        .upsert(
          {
            project_id: projectId,
            target_url: parsedUrl.toString(),
            wcag_level: wcagLevel,
            max_pages: maxPages,
            updated_at: new Date().toISOString(),
            ...(body.interested_check !== undefined ? { interested_check: body.interested_check } : {}),
          },
          { onConflict: 'project_id' }
        )
        .select()
        .single());
    }

    if (monitorError || !monitor) {
      console.error('[monitor-scan] Failed to save monitor config:', monitorError);
      return NextResponse.json({ error: 'Failed to save monitor configuration' }, { status: 500 });
    }

    // Broken links and Page Speed can't run inline here — a real site-wide
    // crawl or a per-page PageSpeed Insights audit (hundreds/thousands of
    // requests) doesn't fit this route's 120s maxDuration. Instead, queue a
    // job for the background worker (apps/worker) to pick up; it runs with
    // no time limit and writes results straight into monitor_issues,
    // reporting progress on the job row for the dashboard to poll (see
    // monitor-client.tsx).
    async function queueBackgroundCheck(checkType: 'broken_links' | 'page_speed' | 'aeo') {
      // Don't queue a second job on top of one that's still pending/running
      // — otherwise every extra "Rescan" click while a crawl is in fligh
      // stacks up a job that just re-crawls the same site again immediately
      // after, and the UI ends up showing the newer queued job's "queued…"
      // message instead of the real in-progress one's progress.
      const { data: activeJob } = await service
        .from('monitor_scan_jobs')
        .select('id')
        .eq('monitor_id', monitor.id)
        .eq('check_type', checkType)
        .in('status', ['pending', 'running', 'cancelling'])
        .limit(1)
        .maybeSingle();
      if (activeJob) return;
      const { error: jobError } = await service
        .from('monitor_scan_jobs')
        .insert({ monitor_id: monitor.id, project_id: projectId, check_type: checkType });
      if (jobError) console.error(`[monitor-scan] Failed to queue ${checkType} job:`, jobError);
    }

    if (enabledChecks.has('broken_links')) await queueBackgroundCheck('broken_links');
    // Page Speed (Google PageSpeed Insights) is bundled under the "SEO &
    // AI-search" checkbox — checking it queues both the fast synchronous SEO
    // checks below AND this background Page Speed job, so the user doesn'
    // need to separately click "Run Page Speed check" every time.
    if (enabledChecks.has('seo')) await queueBackgroundCheck('page_speed');
    // AEO (Answer/AI-search Engine Optimization) — also bundled under "SEO &
    // AI-search", entirely deterministic (see apps/worker/src/aeo.ts), no AI
    // model call. Runs as its own background job for the same reason
    // page_speed does.
    if (enabledChecks.has('seo')) await queueBackgroundCheck('aeo');

    // Everything below (crawl + accessibility/seo/legal/AI checks) runs
    // inline in this one request rather than as a worker job — but it's
    // still multi-step and can take a while (AI checks especially), so i
    // gets its own 'full_scan' progress row the dashboard can poll, exactly
    // like the worker-driven jobs above. `phases` tracks each enabled
    // category's pending/running/completed state as this function walks
    // through them.
    const PHASE_ORDER = ['crawling', 'accessibility', 'seo', 'legal', 'content_quality', 'brand_consistency', 'custom'] as const;
    type Phase = typeof PHASE_ORDER[number];
    const activePhases = PHASE_ORDER.filter((p) => p === 'crawling' || enabledChecks.has(p));
    const phases: Partial<Record<Phase, 'pending' | 'running' | 'completed'>> =
      Object.fromEntries(activePhases.map((p) => [p, 'pending']));

    const { data: fullScanJob } = await service
      .from('monitor_scan_jobs')
      .insert({ monitor_id: monitor.id, project_id: projectId, check_type: 'full_scan', status: 'running', phases, started_at: new Date().toISOString() })
      .select('id')
      .single();
    const fullScanJobId = fullScanJob?.id ?? null;

    async function setPhases(updates: Partial<Record<Phase, 'running' | 'completed'>>) {
      Object.assign(phases, updates);
      if (!fullScanJobId) return;
      const { error } = await service.from('monitor_scan_jobs').update({ phases }).eq('id', fullScanJobId);
      if (error) console.error('[monitor-scan] Failed to update phase progress:', error);
    }
    async function finishFullScanJob(status: 'completed' | 'failed', error?: string) {
      if (!fullScanJobId) return;
      await service.from('monitor_scan_jobs').update({
        status, error: error ?? null, completed_at: new Date().toISOString(),
      }).eq('id', fullScanJobId);
    }

    try {
      return await runScanAndRespond();
    } catch (err) {
      await finishFullScanJob('failed', err instanceof Error ? err.message : String(err));
      throw err;
    }

    async function runScanAndRespond(): Promise<NextResponse> {
      await setPhases({ crawling: 'running' });
      const { pages, failedUrls } = await crawlWebsite(parsedUrl.toString(), maxPages, wcagTagsForLevel(wcagLevel));

      if (pages.length === 0) {
        await finishFullScanJob('failed', 'Could not fetch any pages from this URL.');
        return NextResponse.json(
          { error: 'Could not fetch any pages from this URL. Check that the site is publicly accessible.' },
          { status: 422 }
        );
      }

      // Screenshot once per page (not per finding) and reuse across every rule found on that page.
      const screenshotPaths = new Map<string, string>();
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (page.screenshotBuffer) {
          const path = await uploadScreenshot(service, projectId, page.screenshotBuffer, i);
          if (path) screenshotPaths.set(page.url, path);
        }
      }
      await setPhases({
        crawling: 'completed',
        ...(enabledChecks.has('accessibility') ? { accessibility: 'running' as const } : {}),
        ...(enabledChecks.has('seo') ? { seo: 'running' as const } : {}),
      });

      // Group findings by rule across every scanned page.
      const grouped = new Map<string, {
        title: string; description: string; helpUrl: string; priority: MonitorFinding['priority'];
        category: MonitorFinding['category'];
        pages: Array<{ page_url: string; screenshot_path: string | null; node_html: string; node_target: string }>;
      }>();

      function addFinding(finding: MonitorFinding) {
        const existing = grouped.get(finding.ruleId);
        const pageEntry = {
          page_url: finding.pageUrl,
          screenshot_path: screenshotPaths.get(finding.pageUrl) ?? null,
          node_html: finding.nodeHtml,
          node_target: finding.nodeTarget,
        };
        if (existing) {
          existing.priority = worsePriority(existing.priority, finding.priority);
          existing.pages.push(pageEntry);
        } else {
          grouped.set(finding.ruleId, {
            title: finding.title,
            description: finding.description,
            helpUrl: finding.helpUrl,
            priority: finding.priority,
            category: finding.category,
            pages: [pageEntry],
          });
        }
      }

      for (const page of pages) {
        if (enabledChecks.has('accessibility')) for (const finding of extractFindings(page)) addFinding(finding);
        if (enabledChecks.has('seo')) for (const finding of extractSeoFindings(page)) addFinding(finding);
      }
      if (enabledChecks.has('accessibility')) {
        const { score, failedChecks } = computeAccessibilityScore(pages);
        // null score = axe never actually ran this scan (e.g. no Puppeteer
        // available, fetch-only fallback) — nothing meaningful to log.
        if (score !== null) {
          const { error: scoreError } = await service.from('monitor_accessibility_scores').insert({
            monitor_id: monitor.id, project_id: projectId, score, failed_checks: failedChecks, pages_scanned: pages.length,
          });
          if (scoreError) console.error('[monitor-scan] Failed to log accessibility score:', scoreError);
        }
      }
      await setPhases({
        ...(enabledChecks.has('accessibility') ? { accessibility: 'completed' as const } : {}),
        ...(enabledChecks.has('seo') ? { seo: 'completed' as const } : {}),
        ...(enabledChecks.has('content_quality') ? { content_quality: 'running' as const } : {}),
        ...(enabledChecks.has('brand_consistency') ? { brand_consistency: 'running' as const } : {}),
        ...(enabledChecks.has('custom') ? { custom: 'running' as const } : {}),
      });

      // AI-based checks (content_quality, brand_consistency, custom) are
      // independent of each other — run concurrently so the added latency is
      // whichever is slowest, not their sum. Each is tapped with .then() so its
      // phase flips to 'completed' the moment IT resolves, not only once all
      // three (and legal, below) are done.
      const [contentQualityFindings, brandConsistencyFindings, customCheckFindings] = await Promise.all([
        enabledChecks.has('content_quality')
          ? extractContentQualityFindings(pages).then((r) => { void setPhases({ content_quality: 'completed' }); return r; })
          : Promise.resolve([]),
        enabledChecks.has('brand_consistency')
          ? extractBrandConsistencyFindings(pages).then((r) => { void setPhases({ brand_consistency: 'completed' }); return r; })
          : Promise.resolve([]),
        enabledChecks.has('custom')
          ? extractCustomCheckFindings(pages, customCheckPrompt).then((r) => { void setPhases({ custom: 'completed' }); return r; })
          : Promise.resolve([]),
      ]);
      for (const finding of contentQualityFindings) addFinding(finding);
      for (const finding of brandConsistencyFindings) addFinding(finding);
      for (const finding of customCheckFindings) addFinding(finding);

      if (enabledChecks.has('legal')) {
        await setPhases({ legal: 'running' });
        for (const finding of extractLegalFindings(pages)) addFinding(finding);
        await setPhases({ legal: 'completed' });
      }

      const foundRuleIds = [...grouped.keys()];
      const now = new Date().toISOString();

      if (foundRuleIds.length > 0) {
        const rows = foundRuleIds.map((ruleId) => {
          const g = grouped.get(ruleId)!;
          return {
            monitor_id: monitor.id,
            project_id: projectId,
            rule_id: ruleId,
            title: g.title,
            description: g.description,
            help_url: g.helpUrl,
            priority: g.priority,
            category: g.category,
            pages: g.pages,
            last_seen_at: now,
          };
        });

        let { error: upsertError } = await service
          .from('monitor_issues')
          .upsert(rows, { onConflict: 'monitor_id,rule_id' });

        // 23514 = check constraint violation — e.g. migration 032 (widens
        // monitor_issues.category to allow content_quality/brand_consistency/
        // custom) not applied yet. A single bad row fails the whole batch
        // upsert, which would otherwise also drop this scan's legitimate
        // accessibility/seo/broken_links/legal findings — retry with just the
        // pre-032 categories so those still save.
        if (upsertError && (upsertError as { code?: string }).code === '23514') {
          const legacyRows = rows.filter((r) => LEGACY_CATEGORIES.has(r.category));
          console.warn('[monitor-scan] category check constraint rejected new-category rows — is migration 032 applied? Retrying with legacy categories only.');
          ({ error: upsertError } = legacyRows.length > 0
            ? await service.from('monitor_issues').upsert(legacyRows, { onConflict: 'monitor_id,rule_id' })
            : { error: null });
        }

        if (upsertError) console.error('[monitor-scan] Issue upsert failed:', upsertError);

        // Reopen previously-resolved issues that reappeared. Dismissed issues stay dismissed.
        await service
          .from('monitor_issues')
          .update({ status: 'open', resolved_at: null })
          .eq('monitor_id', monitor.id)
          .eq('status', 'resolved')
          .in('rule_id', foundRuleIds);
      }

      // Auto-resolve open issues that weren't found in this scan — scoped to
      // categories that were actually checked this run (and re-checked
      // synchronously, in this same request), so unchecking e.g. "Conten
      // quality" for one scan doesn't wrongly resolve issues that simply
      // weren't re-checked this time. broken_links is excluded here — tha
      // category's resolve/reopen is handled by the worker once its crawl
      // finishes (see apps/worker/src/index.ts), not by this request, since
      // the crawl itself hasn't happened yet at this point.
      const syncEnabledCategories = [...enabledChecks].filter((c) => c !== 'broken_links');
      let resolveQuery = service
        .from('monitor_issues')
        .update({ status: 'resolved', resolved_at: now })
        .eq('monitor_id', monitor.id)
        .eq('status', 'open')
        .in('category', syncEnabledCategories);
      if (foundRuleIds.length > 0) {
        resolveQuery = resolveQuery.not('rule_id', 'in', `(${foundRuleIds.join(',')})`);
      }
      await resolveQuery;

      await service
        .from('project_monitors')
        .update({ last_scanned_at: now })
        .eq('id', monitor.id);

      await finishFullScanJob('completed');

      return NextResponse.json({
        pagesScanned: pages.length,
        issuesFound: foundRuleIds.length,
        failedUrls,
        brokenLinkJobQueued: enabledChecks.has('broken_links'),
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[monitor-scan] Fatal error:', message);
    return NextResponse.json({ error: 'Internal server error', detail: message }, { status: 500 });
  }
}
