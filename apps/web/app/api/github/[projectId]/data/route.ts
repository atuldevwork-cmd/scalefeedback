import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Props { params: Promise<{ projectId: string }> }

async function getAccessToken(projectId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integrations')
    .select('config')
    .eq('project_id', projectId)
    .eq('type', 'github')
    .single();
  return (data?.config as Record<string, string>)?.accessToken ?? null;
}

export async function GET(req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  const type = req.nextUrl.searchParams.get('type');

  const token = await getAccessToken(projectId);
  if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 });

  try {
    if (type === 'repos') {
      // Fetch up to 100 most recently updated repos the user has access to
      const res = await fetch(
        'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const repos = await res.json();
      const data = repos.map((r: { full_name: string; owner: { login: string }; name: string; private: boolean }) => ({
        id: r.full_name,
        name: r.full_name,
        owner: r.owner.login,
        repo: r.name,
        private: r.private,
      }));
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
