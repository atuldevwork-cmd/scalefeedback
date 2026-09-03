import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/monitor-auth';
import { planAtLeast } from '@/lib/plan';

export const dynamic = 'force-dynamic';

// Competitors tracked for share-of-voice comparison (aeo.md Module B) —
// matched against each engine's response by simple name/domain text search
// (see detectCompetitorsMentioned in apps/worker/src/engines.ts), not a
// precision NLP match.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service } = auth;

  const { data: monitor } = await service.from('project_monitors').select('id').eq('project_id', projectId).maybeSingle();
  if (!monitor) return NextResponse.json({ competitors: [] });

  const { data } = await service
    .from('aeo_competitors')
    .select('id, name, domain, created_at')
    .eq('monitor_id', monitor.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ competitors: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const auth = await requireProjectAccess(projectId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { service, role, plan } = auth;

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Only admins and owners can manage AI Visibility competitors.' }, { status: 403 });
  }
  if (!planAtLeast(plan, 'agency')) {
    return NextResponse.json({ error: 'Website Monitoring is available on the Agency plan.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const domain = typeof body.domain === 'string' ? body.domain.trim() : null;
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (name.length > 200) return NextResponse.json({ error: 'Name is too long (max 200 characters)' }, { status: 400 });

  const { data: monitor } = await service.from('project_monitors').select('id').eq('project_id', projectId).maybeSingle();
  if (!monitor) return NextResponse.json({ error: 'Set up monitoring for this project first.' }, { status: 400 });

  const { data, error } = await service
    .from('aeo_competitors')
    .insert({ monitor_id: monitor.id, project_id: projectId, name, domain: domain || null })
    .select('id, name, domain, created_at')
    .single();
  if (error) {
    console.error('[aeo-competitors] Failed to insert competitor:', error);
    return NextResponse.json({ error: 'Failed to save competitor' }, { status: 500 });
  }

  return NextResponse.json({ competitor: data });
}
