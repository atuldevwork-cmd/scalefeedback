import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { crawlWebsite } from '@/lib/crawler';
import { analyzePages, type ScanIssue } from '@/lib/ai-analyzer';
import type { PageContent } from '@/lib/crawler';

// Allow up to 2 min on Vercel Pro; locally there is no timeout
export const maxDuration = 120;

async function uploadScreenshot(
  service: ReturnType<typeof createServiceClient>,
  projectId: string,
  buffer: Buffer,
  index: number,
  suffix = ''
): Promise<string | null> {
  const tag = suffix ? `-${suffix}` : '';
  const fileName = `${projectId}/ai-scan-${Date.now()}-${index}${tag}.png`;
  console.log(`[ai-scan] Uploading screenshot ${fileName} (${buffer.byteLength} bytes)`);
  const { data, error } = await service.storage
    .from('screenshots')
    .upload(fileName, buffer, { contentType: 'image/png', upsert: false });
  if (error || !data) {
    console.error('[ai-scan] Screenshot upload failed:', JSON.stringify(error));
    return null;
  }
  console.log(`[ai-scan] Screenshot uploaded: ${data.path}`);
  return data.path;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { projectId?: string; url?: string; maxPages?: number };
    const { projectId, url, maxPages = 10 } = body;

    if (!projectId || !url) {
      return NextResponse.json({ error: 'projectId and url are required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL — must include http:// or https://' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: proj } = await service
      .from('projects')
      .select('id, name, organisation_id')
      .eq('id', projectId)
      .single();

    if (!proj) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: membership } = await service
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organisation_id', proj.organisation_id)
      .not('accepted_at', 'is', null)
      .limit(1);

    if (!membership?.length) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { pages, failedUrls } = await crawlWebsite(url, Math.min(Math.max(1, maxPages), 30));

    if (pages.length === 0) {
      return NextResponse.json(
        { error: 'Could not fetch any pages from this URL. Check that the site is publicly accessible.' },
        { status: 422 }
      );
    }

    // Upload screenshots and build url→path maps
    const screenshotPaths = new Map<string, string>();
    const mobileScreenshotPaths = new Map<string, string>();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (page.screenshotBuffer) {
        const path = await uploadScreenshot(service, projectId, page.screenshotBuffer, i, 'desktop');
        if (path) screenshotPaths.set(page.url, path);
      }
      if (page.mobileScreenshotBuffer) {
        const path = await uploadScreenshot(service, projectId, page.mobileScreenshotBuffer, i, 'mobile');
        if (path) mobileScreenshotPaths.set(page.url, path);
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const issues = await analyzePages(pages);

    if (issues.length === 0) {
      return NextResponse.json({
        pagesScanned: pages.length,
        issuesCreated: 0,
        failedUrls,
        message: 'No issues found — the site looks good!',
      });
    }

    // Each issue gets the screenshot that matches where the issue was found
    const buildRow = (issue: ScanIssue, page: PageContent) => {
      const screenshotPath = issue.view === 'mobile'
        ? (mobileScreenshotPaths.get(issue.pageUrl) ?? screenshotPaths.get(issue.pageUrl))
        : (screenshotPaths.get(issue.pageUrl) ?? mobileScreenshotPaths.get(issue.pageUrl));

      const screenshotUrl = screenshotPath && supabaseUrl
        ? `${supabaseUrl}/storage/v1/object/public/screenshots/${screenshotPath}`
        : null;

      return {
        project_id: projectId,
        title: issue.title,
        description: issue.description,
        type: issue.type,
        priority: issue.priority,
        status: 'open',
        page_url: issue.pageUrl,
        screenshot_url: screenshotPath ?? null,
        console_logs: page.consoleErrors.map((e) => ({ level: 'error', message: e })),
        network_logs: [],
        custom_metadata: {
          source: 'ai-scan',
          scan_url: url,
          category: issue.category,
          screenshot_public_url: screenshotUrl,
          view: issue.view,
        },
      };
    };

    // Build a fast lookup for pages by URL
    const pageByUrl = new Map(pages.map((p) => [p.url, p]));

    const { data: inserted, error: insertError } = await service
      .from('feedback')
      .insert(issues.map((issue) => buildRow(issue, pageByUrl.get(issue.pageUrl) ?? pages[0])))
      .select('id');

    if (insertError) {
      console.error('AI scan insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save issues to database' }, { status: 500 });
    }

    return NextResponse.json({
      pagesScanned: pages.length,
      issuesCreated: inserted?.length ?? 0,
      failedUrls,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[ai-scan] Fatal error:', message, stack);
    return NextResponse.json({ error: 'Internal server error', detail: message }, { status: 500 });
  }
}
