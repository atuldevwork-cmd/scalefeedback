import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, MOCK_PROJECTS, MOCK_FEEDBACK } from '@/lib/mock-data';
import { FeedbackStatusBadge } from '@/components/feedback-status-badge';
import { FeedbackTypeBadge } from '@/components/feedback-type-badge';
import { UpdateStatusSelect } from './update-status-select';
import { UpdatePrioritySelect } from './update-priority-select';
import { AssignSelect } from './assign-select';
import { CommentThread } from './comment-thread';
import { ScreenshotLightbox } from '@/components/screenshot-lightbox';
import { ClickUpTaskPanel } from './clickup-task-panel';
import { ClickUpPushButton } from './clickup-push-button';
import { TimelinePanel } from './timeline-panel';
import type { Feedback, Project } from '@scalefeedback/shared';

type ClickUpTaskData = {
  id: string;
  name: string;
  url: string;
  status: { status: string; color: string; type?: string };
  priority?: { priority: string; color: string } | null;
  assignees: { id: number; username: string }[];
};

interface OrgMember { user_id: string; email: string; name: string; }
interface ResolvedComment { id: string; body: string; is_internal: boolean; created_at: string; user_id: string; userName: string; userEmail: string; }

function parseBrowser(raw: string): string {
  if (!raw || !raw.startsWith('Mozilla')) return raw;
  if (raw.includes('Edg/')) { const m = raw.match(/Edg\/([\d.]+)/); return `Edge ${m ? m[1].split('.').slice(0,2).join('.') : ''}`.trim(); }
  if (raw.includes('Chrome/')) { const m = raw.match(/Chrome\/([\d.]+)/); return `Chrome ${m ? m[1].split('.').slice(0,2).join('.') : ''}`.trim(); }
  if (raw.includes('Firefox/')) { const m = raw.match(/Firefox\/([\d.]+)/); return `Firefox ${m ? m[1].split('.').slice(0,2).join('.') : ''}`.trim(); }
  if (raw.includes('Safari/') && !raw.includes('Chrome')) { const m = raw.match(/Version\/([\d.]+)/); return `Safari ${m ? m[1].split('.').slice(0,2).join('.') : ''}`.trim(); }
  return raw;
}

function parseOS(raw: string): string {
  if (!raw) return raw;
  if (raw.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (raw.includes('Windows NT')) return 'Windows';
  if (raw.includes('Mac OS X')) { const m = raw.match(/Mac OS X ([\d_]+)/); return `macOS ${m ? m[1].replace(/_/g,'.').split('.').slice(0,2).join('.') : ''}`.trim(); }
  if (raw === 'MacIntel' || raw === 'MacPPC') return 'macOS';
  if (raw === 'Win32' || raw === 'Win64') return 'Windows';
  if (raw.includes('iPhone')) return 'iOS (iPhone)';
  if (raw.includes('iPad')) return 'iOS (iPad)';
  if (raw.includes('Android')) { const m = raw.match(/Android ([\d.]+)/); return `Android ${m ? m[1] : ''}`.trim(); }
  if (raw.includes('Linux')) return 'Linux';
  return raw;
}

function getOsIcon(os: string): string {
  const o = os.toLowerCase();
  if (o.includes('android')) return '🤖';
  if (o.includes('ios') || o.includes('iphone') || o.includes('ipad')) return '🍎';
  if (o.includes('mac')) return '🍎';
  if (o.includes('windows')) return '🪟';
  if (o.includes('linux')) return '🐧';
  return '💻';
}

function getBrowserIcon(browser: string): string {
  const b = browser.toLowerCase();
  if (b.includes('chrome')) return '🌐';
  if (b.includes('firefox')) return '🦊';
  if (b.includes('safari')) return '🧭';
  if (b.includes('edge')) return '🌀';
  return '🌐';
}

function EnvironmentPanel({ feedback }: { feedback: Feedback }) {
  const hasEnv = feedback.browser || feedback.os || feedback.screen_size || feedback.viewport_size || feedback.device_pixel_ratio;
  if (!feedback.page_url && !hasEnv) return null;

  const browserClean = feedback.browser ? parseBrowser(feedback.browser) : null;
  const osClean = feedback.os ? parseOS(feedback.os) : null;
  const osIcon = osClean ? getOsIcon(osClean) : null;
  const browserIcon = browserClean ? getBrowserIcon(browserClean) : null;
  const dpr = feedback.device_pixel_ratio;
  const dprLabel = dpr != null ? `@${dpr}x` : null;

  const headerIcons = [osIcon, browserIcon, feedback.screen_size ? '📱' : null].filter(Boolean) as string[];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-foreground">Session environment</h2>
        {headerIcons.length > 0 && (
          <span className="flex items-center gap-1 text-base leading-none">{headerIcons.join(' ')}</span>
        )}
      </div>
      <dl className="space-y-3 text-sm">
        {feedback.page_url && (
          <div className="flex items-start gap-3">
            <dt className="text-muted-foreground w-24 shrink-0">Page URL</dt>
            <dd className="font-medium min-w-0">
              <a
                href={feedback.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:underline truncate block max-w-[160px]"
                title={feedback.page_url}
              >
                {feedback.page_url.replace(/^https?:\/\//, '')}
              </a>
            </dd>
          </div>
        )}
        {osClean && (
          <div className="flex items-start gap-3">
            <dt className="text-muted-foreground w-24 shrink-0">OS</dt>
            <dd className="font-medium text-foreground flex items-center gap-1.5">
              <span>{osIcon}</span>
              <span>{osClean}</span>
            </dd>
          </div>
        )}
        {browserClean && (
          <div className="flex items-start gap-3">
            <dt className="text-muted-foreground w-24 shrink-0">Browser</dt>
            <dd className="font-medium text-foreground flex items-center gap-1.5">
              <span>{browserIcon}</span>
              <span>{browserClean}</span>
            </dd>
          </div>
        )}
        {feedback.screen_size && (
          <div className="flex items-start gap-3">
            <dt className="text-muted-foreground w-24 shrink-0">Resolution</dt>
            <dd className="font-medium text-foreground flex items-center gap-1.5">
              <span>📱</span>
              <span>{feedback.screen_size}</span>
            </dd>
          </div>
        )}
        {feedback.viewport_size && (
          <div className="flex items-start gap-3">
            <dt className="text-muted-foreground w-24 shrink-0">Viewport</dt>
            <dd className="font-medium text-foreground">{feedback.viewport_size}</dd>
          </div>
        )}
        {dprLabel && (
          <div className="flex items-start gap-3">
            <dt className="text-muted-foreground w-24 shrink-0">Pixel ratio</dt>
            <dd className="font-medium text-foreground">{dprLabel}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

interface Props {
  params: Promise<{ id: string; feedbackId: string }>;
}

export default async function FeedbackDetailPage({ params }: Props) {
  const { id, feedbackId } = await params;

  let feedback: Feedback | null = null;
  let project: Pick<Project, 'id' | 'name'> | null = null;
  let screenshotPublicUrl: string | null = null;
  let orgMembers: OrgMember[] = [];
  let resolvedComments: ResolvedComment[] = [];
  let currentUserId = '';
  let clickupTask: ClickUpTaskData | null = null;
  let userRole: string | null = null;
  let clickupConnected = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const service = createServiceClient();
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id ?? '';

      const { data: fb } = await supabase.from('feedback').select('*').eq('id', feedbackId).single();
      if (fb) {
        feedback = fb as Feedback;
        const { data: proj } = await supabase.from('projects').select('id, name, organisation_id').eq('id', fb.project_id).single();
        project = proj;
        if (fb.screenshot_url) {
          screenshotPublicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/screenshots/${fb.screenshot_url}`;
        }
        // Fetch role, ClickUp config, and org members in parallel
        if (proj?.organisation_id) {
          const [membershipResult, clickupResult] = await Promise.all([
            service.from('members').select('role, user_id').eq('organisation_id', proj.organisation_id).not('accepted_at', 'is', null),
            service.from('integrations').select('id').eq('project_id', fb.project_id).eq('type', 'clickup').eq('enabled', true).maybeSingle(),
          ]);
          const currentMember = membershipResult.data?.find((m: { user_id: string; role: string }) => m.user_id === user?.id);
          userRole = currentMember?.role ?? null;
          clickupConnected = !!clickupResult.data;

          const { data: members } = membershipResult;

          if (members?.length) {
            const memberIds = members.map((m: { user_id: string }) => m.user_id);
            const { data: usersResp } = await service.auth.admin.listUsers();
            orgMembers = (usersResp?.users ?? [])
              .filter((u) => memberIds.includes(u.id))
              .map((u) => ({
                user_id: u.id,
                email: u.email ?? '',
                name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? u.id.slice(0, 8),
              }));
          }

          // Also include project guests so admins can @mention clients
          if (fb.project_id) {
            const { data: guests } = await service
              .from('project_guests')
              .select('email, name')
              .eq('project_id', fb.project_id)
              .not('accepted_at', 'is', null);

            for (const g of guests ?? []) {
              if (g.email && !orgMembers.some((m) => m.email === g.email)) {
                orgMembers.push({
                  user_id: g.email, // use email as ID for guests
                  email: g.email,
                  name: g.name ?? g.email,
                });
              }
            }
          }
        }
        // Fetch ClickUp task details if external_id exists
        if (fb.external_id) {
          try {
            const { data: cuIntegration } = await supabase
              .from('integrations')
              .select('config')
              .eq('project_id', fb.project_id)
              .eq('type', 'clickup')
              .eq('enabled', true)
              .maybeSingle();

            const token = (cuIntegration?.config as Record<string, string>)?.accessToken;
            if (token) {
              const cuRes = await fetch(`https://api.clickup.com/api/v2/task/${fb.external_id}`, {
                headers: { Authorization: token },
                cache: 'no-store',
              });
              if (cuRes.ok) {
                clickupTask = await cuRes.json();

                // Sync ClickUp comments → ScaleFeedback (fallback for when webhooks can't reach the server)
                const cuCommentsRes = await fetch(
                  `https://api.clickup.com/api/v2/task/${fb.external_id}/comment`,
                  { headers: { Authorization: token }, cache: 'no-store' }
                );
                if (cuCommentsRes.ok) {
                  const { comments: cuComments } = await cuCommentsRes.json() as {
                    comments: { id: string; comment_text: string; user: { username: string }; date: string }[]
                  };
                  const service2 = createServiceClient();
                  // Get existing ScaleFeedback comments to deduplicate
                  const { data: existingComments } = await service2
                    .from('comments')
                    .select('body')
                    .eq('feedback_id', fb.id);
                  const existingBodies = new Set((existingComments ?? []).map((c: { body: string }) => c.body));

                  for (const cc of cuComments ?? []) {
                    const text = cc.comment_text ?? '';
                    if (!text.trim() || text.includes('ScaleFeedback ·') || text.includes('(via ScaleFeedback)')) continue;
                    const body = `[via ClickUp · ${cc.user?.username ?? 'ClickUp'}]\n${text}`;
                    // Also check for old markdown format to avoid re-inserting legacy entries
                  const legacyBody = `**[${cc.user?.username ?? 'ClickUp'} via ClickUp]** ${text}`;
                  if (existingBodies.has(body) || existingBodies.has(legacyBody)) continue;
                    await service2.from('comments').insert({
                      feedback_id: fb.id,
                      user_id: null,
                      body,
                      is_internal: false,
                    });
                  }
                }

                // Sync ClickUp status → ScaleFeedback (fallback for when webhooks can't reach the server)
                if (clickupTask?.status) {
                  const { mapClickUpStatus } = await import('@/lib/integrations/clickup');
                  const syncedStatus = mapClickUpStatus(
                    clickupTask.status.status,
                    clickupTask.status.type ?? ''
                  );
                  if (syncedStatus && syncedStatus !== fb.status) {
                    const service = createServiceClient();
                    await service
                      .from('feedback')
                      .update({ status: syncedStatus })
                      .eq('id', fb.id);
                    await service.from('activity_log').insert({
                      feedback_id: fb.id,
                      user_id: null,
                      action: 'status_changed',
                      details: {
                        from: fb.status,
                        to: syncedStatus,
                        source: 'clickup_sync',
                        clickup_status: clickupTask.status.status,
                      },
                    });
                    // Reflect the change immediately on this render
                    fb.status = syncedStatus;
                    if (feedback) feedback = { ...feedback, status: syncedStatus };
                  }
                }
              }
            }
          } catch { /* non-blocking */ }
        }

        // Fetch comments + resolve user names via service role
        const { data: rawComments } = await service
          .from('comments')
          .select('id, body, is_internal, created_at, user_id')
          .eq('feedback_id', feedbackId)
          .order('created_at', { ascending: true });

        if (rawComments?.length) {
          const userIds = [...new Set(rawComments.map((c: { user_id: string }) => c.user_id).filter(Boolean))];
          const { data: usersResp } = await service.auth.admin.listUsers();
          const userMap: Record<string, { name: string; email: string }> = {};
          for (const u of usersResp?.users ?? []) {
            if (userIds.includes(u.id)) {
              userMap[u.id] = {
                name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? 'Unknown',
                email: u.email ?? '',
              };
            }
          }
          resolvedComments = rawComments.map((c: { id: string; body: string; is_internal: boolean; created_at: string; user_id: string }) => ({
            ...c,
            userName: userMap[c.user_id]?.name ?? 'Unknown',
            userEmail: userMap[c.user_id]?.email ?? '',
          }));
        }
      }
    } catch { /* fall through */ }
  }

  if (!feedback) {
    feedback = MOCK_FEEDBACK.find((f) => f.id === feedbackId) ?? null;
    if (feedback) {
      const mp = MOCK_PROJECTS.find((p) => p.id === feedback!.project_id);
      project = mp ? { id: mp.id, name: mp.name } : null;
    }
  }

  if (!feedback || !project) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Feedback not found.{' '}
        <Link href={`/projects/${id}`} className="text-violet-600 underline">Go back</Link>
      </div>
    );
  }

  const consoleLogs = Array.isArray(feedback.console_logs) ? feedback.console_logs : [];
  const networkLogs = Array.isArray(feedback.network_logs) ? feedback.network_logs : [];

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-foreground">{project.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-xs">{feedback.title ?? 'Feedback'}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: screenshot + description + logs */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FeedbackTypeBadge type={feedback.type} />
              <FeedbackStatusBadge status={feedback.status} />
            </div>
            <h1 className="text-xl font-bold text-foreground">{feedback.title ?? feedback.page_url}</h1>
            {feedback.description && (
              <p className="text-muted-foreground mt-2 leading-relaxed">{feedback.description}</p>
            )}
          </div>

          {/* Screenshot */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Screenshot</h2>
            {screenshotPublicUrl ? (
              <ScreenshotLightbox src={screenshotPublicUrl} alt="Feedback screenshot" />
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center h-48">
                <div className="text-center text-muted-foreground">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">No screenshot captured</p>
                </div>
              </div>
            )}
          </div>

          {/* Console logs */}
          {consoleLogs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Console Logs ({consoleLogs.length})</h2>
              <div className="bg-gray-950 rounded-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto p-4 space-y-1 font-mono text-xs">
                  {consoleLogs.map((log, i) => (
                    <div key={i} className={`flex gap-3 ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'}`}>
                      <span className="text-gray-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="uppercase text-xs font-bold shrink-0 w-8">{log.level}</span>
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Network logs */}
          {networkLogs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Failed Network Requests ({networkLogs.length})</h2>
              <div className="space-y-2">
                {networkLogs.map((log, i) => (
                  <div key={i} className="bg-muted rounded-lg px-4 py-3 font-mono text-xs flex items-center gap-3">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold shrink-0">{log.status}</span>
                    <span className="font-semibold shrink-0">{log.method}</span>
                    <span className="text-muted-foreground truncate">{log.url}</span>
                    {log.duration && <span className="text-muted-foreground shrink-0">{log.duration}ms</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <CommentThread feedbackId={feedbackId} initialComments={resolvedComments} currentUserId={currentUserId} members={orgMembers} />
        </div>

        {/* Right: metadata panel */}
        <div className="space-y-4">
          {/* ClickUp task — top of sidebar when linked */}
          {clickupTask && <ClickUpTaskPanel task={clickupTask} />}

          {/* Push to ClickUp — shown for AI-scan issues not yet pushed */}
          {!clickupTask && !feedback.external_id && clickupConnected &&
           feedback.custom_metadata?.source === 'ai-scan' &&
           (userRole === 'owner' || userRole === 'admin') && (
            <ClickUpPushButton feedbackId={feedbackId} />
          )}

          {/* Status */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Status</h2>
            <UpdateStatusSelect feedbackId={feedbackId} currentStatus={feedback.status} />
          </div>

          {/* Priority */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Priority</h2>
            <UpdatePrioritySelect feedbackId={feedbackId} currentPriority={feedback.priority} />
          </div>

          {/* Assignee */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Assignee</h2>
            <AssignSelect
              feedbackId={feedbackId}
              currentAssignee={feedback.assigned_to ?? null}
              members={orgMembers}
            />
          </div>

          {/* Reporter */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Reporter</h2>
            <div className="space-y-1 text-sm">
              {feedback.reporter_name
                ? <p className="font-medium text-foreground">{feedback.reporter_name}</p>
                : <p className="text-muted-foreground italic">Anonymous</p>}
              {feedback.reporter_email && <p className="text-muted-foreground">{feedback.reporter_email}</p>}
            </div>
          </div>

          {/* Environment */}
          <EnvironmentPanel feedback={feedback} />

          {/* Timeline */}
          <TimelinePanel createdAt={feedback.created_at} updatedAt={feedback.updated_at} />
        </div>
      </div>
    </div>
  );
}
