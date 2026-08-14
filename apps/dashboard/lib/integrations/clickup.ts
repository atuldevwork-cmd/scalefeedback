import { parseBrowser, parseOS } from './format';

interface ClickUpPayload {
  accessToken: string;
  listId: string;
  assigneeId?: string;
  feedbackTitle: string;
  feedbackType: string;
  description?: string;
  reporterName?: string;
  pageUrl: string;
  dashboardUrl: string;
  screenshotUrl?: string;
  // Session environment
  browser?: string;
  os?: string;
  screenSize?: string;
  viewportSize?: string;
  devicePixelRatio?: number;
}

const PRIORITY_MAP: Record<string, number> = {
  bug: 2,        // high
  suggestion: 3, // normal
  question: 3,   // normal
  other: 4,      // low
};

/** Returns the created task's ID and URL, or null on failure. */
export async function createClickUpTask(
  p: ClickUpPayload
): Promise<{ taskId: string; taskUrl: string } | null> {
  const name = p.feedbackTitle || `[${p.feedbackType}] Feedback from ${p.pageUrl}`;

  const browserClean = p.browser ? parseBrowser(p.browser) : null;
  const osClean = p.os ? parseOS(p.os) : null;

  const sessionLines: string[] = [];
  if (browserClean || osClean || p.screenSize || p.viewportSize || p.devicePixelRatio) {
    sessionLines.push('', '---', '**Session Environment**');
    if (browserClean)        sessionLines.push(`- **Browser:** ${browserClean}`);
    if (osClean)             sessionLines.push(`- **OS:** ${osClean}`);
    if (p.screenSize)        sessionLines.push(`- **Resolution:** ${p.screenSize}`);
    if (p.viewportSize)      sessionLines.push(`- **Viewport:** ${p.viewportSize}`);
    if (p.devicePixelRatio)  sessionLines.push(`- **Pixel ratio:** @${p.devicePixelRatio}x`);
  }

  const markdownDescription = [
    `**Reported by:** ${p.reporterName ?? 'Anonymous'}`,
    `**Source URL:** ${p.pageUrl}`,
    `**Issue type:** ${p.feedbackType}`,
    '',
    p.description ?? '',
    ...sessionLines,
    '',
    `[View in Pinmarks Dashboard](${p.dashboardUrl})`,
  ]
    .join('\n')
    .trim();

  const body: Record<string, unknown> = {
    name,
    markdown_description: markdownDescription,
    priority: PRIORITY_MAP[p.feedbackType] ?? 3,
    tags: ['pinmarks', p.feedbackType],
  };

  if (p.assigneeId) {
    body.assignees = [Number(p.assigneeId)];
  }

  const res = await fetch(`https://api.clickup.com/api/v2/list/${p.listId}/task`, {
    method: 'POST',
    headers: {
      Authorization: p.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  const task = await res.json();

  // Attach screenshot if provided
  if (p.screenshotUrl) {
    try {
      const imgRes = await fetch(p.screenshotUrl);
      if (imgRes.ok) {
        const imgBuffer = await imgRes.arrayBuffer();
        const form = new FormData();
        form.append(
          'attachment',
          new Blob([imgBuffer], { type: 'image/png' }),
          'screenshot.png'
        );
        await fetch(`https://api.clickup.com/api/v2/task/${task.id}/attachment`, {
          method: 'POST',
          headers: { Authorization: p.accessToken },
          body: form,
        });
      }
    } catch {
      // Attachment failure must not block task creation
    }
  }

  return { taskId: task.id, taskUrl: task.url };
}

/** Map a ClickUp status string/type to a Pinmarks status enum value. */
export function mapClickUpStatus(
  statusName: string,
  statusType: string
): 'open' | 'in_progress' | 'resolved' | 'closed' | null {
  const name = statusName.toLowerCase().trim();
  const type = statusType.toLowerCase().trim();

  if (type === 'closed') return 'closed';
  if (type === 'done') return 'resolved';

  if (['to do', 'open', 'backlog', 'todo', 'new'].includes(name)) return 'open';
  if (['in progress', 'in review', 'review', 'doing', 'active'].includes(name)) return 'in_progress';
  if (['complete', 'done', 'completed', 'resolved', 'fixed'].includes(name)) return 'resolved';
  if (['closed', 'cancelled', 'canceled', "won't fix", 'wont fix', 'invalid'].includes(name)) return 'closed';

  return null;
}
