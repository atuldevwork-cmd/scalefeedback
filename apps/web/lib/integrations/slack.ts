interface SlackPayload {
  webhookUrl: string;
  projectName: string;
  feedbackTitle: string;
  feedbackType: string;
  description?: string;
  reporterName?: string;
  pageUrl: string;
  dashboardUrl: string;
  status: string;
  priority?: string;
  screenshotUrl?: string;
}

const TYPE_EMOJI: Record<string, string> = {
  bug: '🐛', suggestion: '💡', question: '❓', other: '📝',
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: '🔴 Critical', high: '🟠 High', medium: '🟡 Medium', low: '🟢 Low',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved',
  closed: 'Closed', wont_fix: "Won't Fix",
};

function isPublicUrl(url: string): boolean {
  return !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('::1');
}

export async function sendSlackNotification(p: SlackPayload): Promise<void> {
  const emoji = TYPE_EMOJI[p.feedbackType] ?? '📝';
  const typeLabel = p.feedbackType.charAt(0).toUpperCase() + p.feedbackType.slice(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} New ${typeLabel} — ${p.projectName}`, emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${p.feedbackTitle}*${p.description ? `\n${p.description}` : ''}`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Type:*\n${emoji} ${typeLabel}` },
        { type: 'mrkdwn', text: `*Priority:*\n${p.priority ? (PRIORITY_LABEL[p.priority] ?? p.priority) : '—'}` },
        { type: 'mrkdwn', text: `*Status:*\n${STATUS_LABEL[p.status] ?? p.status}` },
        { type: 'mrkdwn', text: `*Reporter:*\n${p.reporterName ?? 'Anonymous'}` },
        { type: 'mrkdwn', text: `*Page:*\n${p.pageUrl}` },
      ],
    },
  ];

  // Only include screenshot if URL is publicly accessible (not localhost)
  if (p.screenshotUrl && isPublicUrl(p.screenshotUrl)) {
    blocks.push({
      type: 'image',
      image_url: p.screenshotUrl,
      alt_text: 'Feedback screenshot',
    });
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '👀 View in Dashboard', emoji: true },
        url: p.dashboardUrl,
        style: 'primary',
      },
    ],
  });

  const res = await fetch(p.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `${emoji} New ${typeLabel} on ${p.projectName}: ${p.feedbackTitle}`, blocks }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Slack] Webhook failed:', res.status, text);
  }
}
