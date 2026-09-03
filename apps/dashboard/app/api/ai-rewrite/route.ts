import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { planAtLeast } from '@/lib/plan';
import { rewriteFeedbackText } from '@/lib/ai-text';

const CORS = { 'Access-Control-Allow-Origin': '*' };

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const rl = rateLimit(`ai-rewrite:${ip}`, 15, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, {
        status: 429,
        headers: { 'Retry-After': '60', ...CORS },
      });
    }

    const body: { project_api_key?: string; title?: string; description?: string } = await request.json();

    if (!body.title?.trim() && !body.description?.trim()) {
      return NextResponse.json({ error: 'Nothing to improve' }, { status: 400, headers: CORS });
    }

    const supabase = await createServiceClient();

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, is_active, organisation_id')
      .eq('api_key', body.project_api_key)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: CORS });
    }
    if (!project.is_active) {
      return NextResponse.json({ error: 'Project is inactive' }, { status: 403, headers: CORS });
    }

    const { data: org } = await supabase
      .from('organisations')
      .select('plan')
      .eq('id', project.organisation_id)
      .single();

    if (!planAtLeast(org?.plan, 'pro')) {
      return NextResponse.json({ error: 'This feature requires a Pro plan or above.' }, { status: 403, headers: CORS });
    }

    const { title, description } = await rewriteFeedbackText({ title: body.title, description: body.description });

    return NextResponse.json({ title, description }, { status: 200, headers: CORS });
  } catch (error) {
    console.error('ai-rewrite API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
