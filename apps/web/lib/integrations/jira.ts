interface JiraPayload {
  accessToken: string;
  cloudId: string;
  projectKey: string;
  feedbackTitle: string;
  feedbackType: string;
  description?: string;
  reporterName?: string;
  pageUrl: string;
  dashboardUrl: string;
}

export async function createJiraIssue(p: JiraPayload): Promise<void> {
  const auth = { Authorization: `Bearer ${p.accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  const base = `https://api.atlassian.com/ex/jira/${p.cloudId}/rest/api/3`;

  // Fetch available issue types for the project
  let issueTypeId: string | undefined;
  try {
    const typesRes = await fetch(`${base}/issue/createmeta/${p.projectKey}/issuetypes`, { headers: auth });
    if (typesRes.ok) {
      const typesData = await typesRes.json() as { issueTypes?: Array<{ id: string; name: string }> };
      const types = typesData.issueTypes ?? [];
      const preferred = p.feedbackType === 'bug' ? ['Bug', 'Task', 'Story', 'Issue'] : ['Task', 'Story', 'Bug', 'Issue'];
      const match = preferred.map(name => types.find(t => t.name === name)).find(Boolean) ?? types[0];
      issueTypeId = match?.id;
    }
  } catch { /* fall through to use name */ }

  const summary = p.feedbackTitle || `[${p.feedbackType}] New feedback`;
  const description = {
    type: 'doc', version: 1,
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: `Type: ${p.feedbackType}` }] },
      { type: 'paragraph', content: [{ type: 'text', text: `Page: ${p.pageUrl}` }] },
      { type: 'paragraph', content: [{ type: 'text', text: `Reporter: ${p.reporterName ?? 'Anonymous'}` }] },
      ...(p.description ? [{ type: 'paragraph', content: [{ type: 'text', text: p.description }] }] : []),
      { type: 'paragraph', content: [{ type: 'text', text: `Dashboard: ${p.dashboardUrl}` }] },
    ],
  };

  const issuetype = issueTypeId ? { id: issueTypeId } : { name: 'Task' };

  const res = await fetch(`${base}/issue`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ fields: { project: { key: p.projectKey }, summary, description, issuetype } }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[Jira] Create issue failed:', res.status, err);
  }
}
