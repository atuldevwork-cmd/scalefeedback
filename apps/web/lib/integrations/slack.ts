interface SlackPayload {
  webhookUrl: string;
  projectName: string;
  feedbackTitle: string;
  feedbackType: string;
  reporterName?: string;
  pageUrl: string;
  dashboardUrl: string;
  status: string;
}

export async function sendSlackNotification(p: SlackPayload): Promise<void> {
  const emoji = { bug: '🐛', suggestion: '💡', question: '❓', other: '📝' }[p.feedbackType] ?? '📝';
  const body = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *New ${p.feedbackType} on ${p.projectName}*\n${p.feedbackTitle}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Page:*\n${p.pageUrl}` },
          { type: 'mrkdwn', text: `*Reporter:*\n${p.reporterName ?? 'Anonymous'}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in Dashboard' },
            url: p.dashboardUrl,
            style: 'primary',
          },
        ],
      },
    ],
  };

  await fetch(p.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
