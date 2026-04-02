import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Props { params: Promise<{ projectId: string }> }

async function getAccessToken(projectId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integrations')
    .select('config')
    .eq('project_id', projectId)
    .eq('type', 'clickup')
    .single();
  return (data?.config as Record<string, string>)?.accessToken ?? null;
}

async function clickupFetch(path: string, token: string) {
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`ClickUp API error: ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest, { params }: Props) {
  const { projectId } = await params;
  const type = req.nextUrl.searchParams.get('type');

  const token = await getAccessToken(projectId);
  if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 });

  try {
    if (type === 'workspaces') {
      const { teams } = await clickupFetch('/team', token);
      const workspaces = (teams ?? []).map((t: { id: string; name: string }) => ({
        id: t.id,
        name: t.name,
      }));
      return NextResponse.json({ data: workspaces });
    }

    if (type === 'spaces') {
      const workspaceId = req.nextUrl.searchParams.get('workspaceId');
      if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
      const { spaces } = await clickupFetch(`/team/${workspaceId}/space?archived=false`, token);
      const data = (spaces ?? []).map((s: { id: string; name: string }) => ({
        id: s.id,
        name: s.name,
      }));
      return NextResponse.json({ data });
    }

    if (type === 'lists') {
      const spaceId = req.nextUrl.searchParams.get('spaceId');
      if (!spaceId) return NextResponse.json({ error: 'Missing spaceId' }, { status: 400 });

      // Fetch folderless lists and folders in parallel
      const [folderlessRes, foldersRes] = await Promise.all([
        clickupFetch(`/space/${spaceId}/list?archived=false`, token),
        clickupFetch(`/space/${spaceId}/folder?archived=false`, token),
      ]);

      const lists: { id: string; name: string; folder?: string }[] = [];

      for (const l of folderlessRes.lists ?? []) {
        lists.push({ id: l.id, name: l.name });
      }

      for (const folder of foldersRes.folders ?? []) {
        const folderLists = await clickupFetch(`/folder/${folder.id}/list?archived=false`, token);
        for (const l of folderLists.lists ?? []) {
          lists.push({ id: l.id, name: l.name, folder: folder.name });
        }
      }

      return NextResponse.json({ data: lists });
    }

    if (type === 'members') {
      const listId = req.nextUrl.searchParams.get('listId');
      if (!listId) return NextResponse.json({ error: 'Missing listId' }, { status: 400 });
      const { members } = await clickupFetch(`/list/${listId}/member`, token);
      const data = (members ?? []).map((m: { id: number; username: string; profilePicture: string | null }) => ({
        id: String(m.id),
        name: m.username,
        avatar: m.profilePicture,
      }));
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
