interface GithubPayload {
  accessToken: string;  // OAuth access token
  owner: string;
  repo: string;
  projectName: string;
  feedbackTitle: string;
  feedbackType: string;
  description?: string;
  reporterName?: string;
  pageUrl: string;
  dashboardUrl: string;
}

export async function createGithubIssue(p: GithubPayload): Promise<void> {
  const title = p.feedbackTitle || `[${p.feedbackType}] Feedback from ${p.projectName}`;
  const body = [
    `**Type:** ${p.feedbackType}`,
    `**Page:** ${p.pageUrl}`,
    `**Reporter:** ${p.reporterName ?? 'Anonymous'}`,
    '',
    p.description ? `**Description:**\n${p.description}` : '',
    '',
    `[View in ScaleFeedback Dashboard](${p.dashboardUrl})`,
  ].join('\n');

  await fetch(`https://api.github.com/repos/${p.owner}/${p.repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${p.accessToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, labels: ['feedback', p.feedbackType] }),
  });
}
