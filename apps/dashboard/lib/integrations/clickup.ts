import { parseBrowser, parseOS } from './format';

export type PinmarksSourceField =
  | 'title' | 'description' | 'type' | 'priority'
  | 'assigned_to' | 'due_date' | 'reporter_name' | 'reporter_email';

export interface ClickUpFieldMapping {
  source: PinmarksSourceField;
  destination: { kind: 'native' | 'custom'; key: string } | null;
}

export interface ClickUpDestinationField {
  id: string;
  kind: 'native' | 'custom';
  name: string;
  type: string;
  options?: { id: string; name: string; color?: string }[];
}

interface ClickUpPayload {
  accessToken: string;
  listId: string;
  assigneeId?: string;
  feedbackTitle: string;
  feedbackType: string;
  description?: string;
  reporterName?: string;
  reporterEmail?: string;
  pageUrl: string;
  dashboardUrl: string;
  screenshotUrl?: string;
  // Real feedback columns — only used when fieldMappings is set (see below).
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string | null;
  // When set, overrides the legacy hardcoded shape below with a per-field
  // mapping built by the project's ClickUp Field Mapper (settings).
  fieldMappings?: ClickUpFieldMapping[];
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

// ClickUp's own priority scale is inverted from what you'd guess: 1 = Urgent
// (highest), 4 = Low. Only used once a project has configured field mappings —
// the legacy path above keeps deriving priority from feedback type instead.
const NATIVE_PRIORITY_MAP: Record<string, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

/** Fetches the custom field definitions for a ClickUp list, plus synthetic
 * entries for ClickUp's native task properties (Assignee/Priority/Due
 * date/Tags) that are set via top-level POST body keys rather than the
 * `custom_fields` array — the mapper UI needs both in one unified list. */
export async function getClickUpListFields(
  accessToken: string,
  listId: string
): Promise<ClickUpDestinationField[]> {
  const native: ClickUpDestinationField[] = [
    { id: 'assignees', kind: 'native', name: 'Assignee', type: 'native_users' },
    { id: 'priority', kind: 'native', name: 'Priority', type: 'native_priority' },
    { id: 'due_date', kind: 'native', name: 'Due date', type: 'native_date' },
    { id: 'tags', kind: 'native', name: 'Tags', type: 'native_labels' },
  ];

  interface RawField {
    id: string;
    name: string;
    type: string;
    type_config?: { options?: { id?: string; orderindex?: number; name: string; color?: string }[] };
  }

  let custom: ClickUpDestinationField[] = [];
  try {
    const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/field`, {
      headers: { Authorization: accessToken },
    });
    if (res.ok) {
      const { fields } = await res.json();
      custom = ((fields ?? []) as RawField[]).map((f) => ({
        id: f.id,
        kind: 'custom' as const,
        name: f.name,
        type: f.type,
        options: f.type_config?.options?.map((o) => ({
          id: o.id ?? String(o.orderindex),
          name: o.name,
          color: o.color,
        })),
      }));
    }
  } catch {
    // Native destinations don't depend on this call succeeding — degrade
    // gracefully to native-only rather than losing the mapper entirely.
  }

  return [...native, ...custom];
}

/** Resolves a mapping's source field to its raw value from the feedback payload. */
function sourceValue(source: PinmarksSourceField, p: ClickUpPayload): unknown {
  switch (source) {
    case 'title': return p.feedbackTitle;
    case 'description': return p.description;
    case 'type': return p.feedbackType;
    case 'priority': return p.priority;
    case 'assigned_to': return p.assigneeId;
    case 'due_date': return p.dueDate;
    case 'reporter_name': return p.reporterName;
    case 'reporter_email': return p.reporterEmail;
    default: return undefined;
  }
}

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
  };

  if (!p.fieldMappings) {
    // Legacy/default behavior — unchanged for any project that hasn't
    // configured field mappings yet.
    body.priority = PRIORITY_MAP[p.feedbackType] ?? 3;
    body.tags = ['pinmarks', p.feedbackType];
    if (p.assigneeId) body.assignees = [Number(p.assigneeId)];
  } else {
    const customFields: { id: string; value: unknown }[] = [];
    for (const m of p.fieldMappings) {
      if (!m.destination) continue;
      const raw = sourceValue(m.source, p);
      if (raw == null || raw === '') continue;

      if (m.destination.kind === 'native') {
        switch (m.destination.key) {
          case 'priority':
            body.priority = NATIVE_PRIORITY_MAP[raw as string] ?? 3;
            break;
          case 'due_date':
            body.due_date = new Date(raw as string).getTime();
            break;
          case 'assignees':
            body.assignees = [Number(raw)];
            break;
          case 'tags':
            body.tags = Array.isArray(raw) ? raw : [String(raw)];
            break;
        }
      } else {
        customFields.push({ id: m.destination.key, value: raw });
      }
    }
    if (customFields.length) body.custom_fields = customFields;
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
