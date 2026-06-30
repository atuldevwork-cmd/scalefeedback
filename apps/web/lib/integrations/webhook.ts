interface WebhookPayload {
  url: string;
  secret?: string;
  feedbackId: string;
  projectName: string;
  feedbackTitle: string;
  feedbackType: string;
  description?: string;
  reporterName?: string;
  pageUrl: string;
  status: string;
  dashboardUrl: string;
}

export async function fireWebhook(p: WebhookPayload): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (p.secret) headers['X-Pinmarks-Secret'] = p.secret;

  await fetch(p.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      event: 'feedback.created',
      feedback_id: p.feedbackId,
      project: p.projectName,
      title: p.feedbackTitle,
      type: p.feedbackType,
      description: p.description,
      reporter: p.reporterName,
      page_url: p.pageUrl,
      status: p.status,
      dashboard_url: p.dashboardUrl,
      timestamp: new Date().toISOString(),
    }),
  });
}
