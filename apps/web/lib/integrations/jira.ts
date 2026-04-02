interface JiraPayload {
  accessToken: string;  // Atlassian OAuth access token
  cloudId: string;      // Atlassian cloud site ID
  projectKey: string;   // e.g. "FEED"
  feedbackTitle: string;
  feedbackType: string;
  description?: string;
  reporterName?: string;
  pageUrl: string;
  dashboardUrl: string;
}

export async function createJiraIssue(p: JiraPayload): Promise<void> {
  const summary = p.feedbackTitle || `[${p.feedbackType}] New feedback`;
  const description = {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `Type: ${p.feedbackType}` }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `Page: ${p.pageUrl}` }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `Reporter: ${p.reporterName ?? 'Anonymous'}` }],
      },
      ...(p.description ? [{
        type: 'paragraph',
        content: [{ type: 'text', text: p.description }],
      }] : []),
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `Dashboard: ${p.dashboardUrl}` }],
      },
    ],
  };

  await fetch(
    `https://api.atlassian.com/ex/jira/${p.cloudId}/rest/api/3/issue`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${p.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: p.projectKey },
          summary,
          description,
          issuetype: { name: 'Bug' },
        },
      }),
    }
  );
}
