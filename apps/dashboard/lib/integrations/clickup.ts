function parseBrowser(raw: string): string {
  if (!raw || !raw.startsWith('Mozilla')) return raw;
  if (raw.includes('Edg/')) {
    const m = raw.match(/Edg\/([\d.]+)/);
    return `Edge ${m ? m[1].split('.').slice(0, 2).join('.') : ''}`.trim();
  }
  if (raw.includes('Chrome/')) {
    const m = raw.match(/Chrome\/([\d.]+)/);
    return `Chrome ${m ? m[1].split('.').slice(0, 2).join('.') : ''}`.trim();
  }
  if (raw.includes('Firefox/')) {
    const m = raw.match(/Firefox\/([\d.]+)/);
    return `Firefox ${m ? m[1].split('.').slice(0, 2).join('.') : ''}`.trim();
  }
  if (raw.includes('Safari/') && !raw.includes('Chrome')) {
    const m = raw.match(/Version\/([\d.]+)/);
    return `Safari ${m ? m[1].split('.').slice(0, 2).join('.') : ''}`.trim();
  }
  return raw;
}

function parseOS(raw: string): string {
  if (!raw) return raw;
  if (raw.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (raw.includes('Windows NT')) return 'Windows';
  if (raw.includes('Mac OS X')) {
    const m = raw.match(/Mac OS X ([\d_]+)/);
    return `macOS ${m ? m[1].replace(/_/g, '.').split('.').slice(0, 2).join('.') : ''}`.trim();
  }
  if (raw === 'MacIntel' || raw === 'MacPPC') return 'macOS';
  if (raw === 'Win32' || raw === 'Win64') return 'Windows';
  if (raw.includes('iPhone')) return 'iOS (iPhone)';
  if (raw.includes('iPad')) return 'iOS (iPad)';
  if (raw.includes('Android')) {
    const m = raw.match(/Android ([\d.]+)/);
    return `Android ${m ? m[1] : ''}`.trim();
  }
  if (raw.includes('Linux')) return 'Linux';
  return raw;
}

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
    tags: ['scalefeedback', p.feedbackType],
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
