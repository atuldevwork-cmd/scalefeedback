import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Props { params: Promise<{ projectId: string }> }

async function getConfig(projectId: string): Promise<Record<string, string> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integrations')
    .select('config')
    .eq('project_id', projectId)
    .eq('type', 'jira')
    .single();
  return (data?.config as Record<string, string>) ?? null;
}

export async function GET(req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  const type = req.nextUrl.searchParams.get('type');

  const config = await getConfig(projectId);
  if (!config?.accessToken) return NextResponse.json({ error: 'Not connected' }, { status: 401 });

  const { accessToken } = config;
  const authHeader = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };

  try {
    if (type === 'sites') {
      const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: authHeader,
      });
      if (!res.ok) throw new Error(`Atlassian API error: ${res.status}`);
      const sites = await res.json();
      const data = sites.map((s: { id: string; name: string; url: string; avatarUrl: string }) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        avatar: s.avatarUrl,
      }));
      return NextResponse.json({ data });
    }

    if (type === 'projects') {
      const cloudId = req.nextUrl.searchParams.get('cloudId');
      if (!cloudId) return NextResponse.json({ error: 'Missing cloudId' }, { status: 400 });

      const res = await fetch(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=100`,
        { headers: authHeader }
      );
      if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
      const json = await res.json();
      const data = (json.values ?? []).map((p: { id: string; key: string; name: string; avatarUrls: Record<string, string> }) => ({
        id: p.key,
        name: p.name,
        key: p.key,
        avatar: p.avatarUrls?.['24x24'],
      }));
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
