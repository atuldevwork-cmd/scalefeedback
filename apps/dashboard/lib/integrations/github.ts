import { parseBrowser, parseOS, summariseConsoleLogs, type ConsoleLogEntry } from './format';

interface GithubPayload {
  accessToken: string;  // OAuth access token
  owner: string;
  repo: string;
  projectName: string;
  feedbackTitle: string;
  feedbackType: string;
  description?: string;
  reporterName?: string;
  reporterEmail?: string;
  pageUrl: string;
  dashboardUrl: string;
  screenshotUrl?: string;
  // Session environment
  browser?: string;
  os?: string;
  screenSize?: string;
  viewportSize?: string;
  devicePixelRatio?: number;
  // Extras
  consoleLogs?: ConsoleLogEntry[];
  hasSessionReplay?: boolean;
  customMetadata?: Record<string, unknown>;
}

/** Returns the created issue's number and URL, or null on failure. */
export async function createGithubIssue(p: GithubPayload): Promise<{ issueNumber: number; issueUrl: string } | null> {
  const title = p.feedbackTitle || `[${p.feedbackType}] Feedback from ${p.projectName}`;

  const reportedBy = p.reporterName
    ? p.reporterEmail ? `${p.reporterName} (${p.reporterEmail})` : p.reporterName
    : 'Anonymous';

  const browserClean = p.browser ? parseBrowser(p.browser) : null;
  const osClean = p.os ? parseOS(p.os) : null;

  const envRows: [string, string][] = [];
  if (browserClean)       envRows.push(['Browser', browserClean]);
  if (osClean)            envRows.push(['OS', osClean]);
  if (p.screenSize)       envRows.push(['Screen Size', p.screenSize]);
  if (p.viewportSize)     envRows.push(['Viewport Size', p.viewportSize]);
  if (p.devicePixelRatio) envRows.push(['Pixel Ratio', `@${p.devicePixelRatio}x`]);

  const consoleSummary = summariseConsoleLogs(p.consoleLogs);

  const metadataEntries = p.customMetadata ? Object.entries(p.customMetadata) : [];

  const body = [
    p.screenshotUrl ? `![Screenshot](${p.screenshotUrl})` : '',
    '',
    `**Reported by:** ${reportedBy}`,
    `**Source URL:** ${p.pageUrl}`,
    `**Issue details:** [Open in Pinmarks](${p.dashboardUrl})`,
    '',
    p.description ? `${p.description}\n` : '',
    consoleSummary ? `**Console:** ${consoleSummary}` : '',
    p.hasSessionReplay ? `**Session replay:** [View recording](${p.dashboardUrl})` : '',
    '',
    envRows.length
      ? ['| Field | Value |', '|---|---|', ...envRows.map(([k, v]) => `| ${k} | ${v} |`)].join('\n')
      : '',
    '',
    metadataEntries.length
      ? ['**Custom metadata**', ...metadataEntries.map(([k, v]) => `- **${k}:** ${String(v)}`)].join('\n')
      : '',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n')
    .trim();

  const res = await fetch(`https://api.github.com/repos/${p.owner}/${p.repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${p.accessToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, labels: ['feedback', p.feedbackType] }),
  });

  if (!res.ok) return null;
  const issue = await res.json();
  return { issueNumber: issue.number, issueUrl: issue.html_url };
}

/** Map a GitHub issue's state (+ state_reason, if available) to a Pinmarks status enum value. */
export function mapGithubState(
  state: string,
  stateReason?: string | null
): 'open' | 'in_progress' | 'resolved' | 'closed' | null {
  if (state === 'open') return 'open';
  if (state === 'closed') {
    if (stateReason === 'not_planned') return 'closed';
    return 'resolved'; // default: closed as completed
  }
  return null;
}
