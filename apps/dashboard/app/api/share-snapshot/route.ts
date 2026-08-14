import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

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
    const rl = rateLimit(`share-snapshot:${ip}`, 15, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, {
        status: 429,
        headers: { 'Retry-After': '60', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const body: { project_api_key?: string; screenshot?: string } = await request.json();
    if (!body.screenshot) {
      return NextResponse.json({ error: 'Missing screenshot' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const supabase = await createServiceClient();

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, is_active')
      .eq('api_key', body.project_api_key)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    if (!project.is_active) {
      return NextResponse.json({ error: 'Project is inactive' }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const base64Data = body.screenshot.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const storagePath = `${project.id}/shared/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(storagePath, buffer, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      console.error('share-snapshot upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload screenshot' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const token = randomUUID().replace(/-/g, '').slice(0, 12);
    const { error: insertError } = await supabase
      .from('shared_snapshots')
      .insert({ token, project_id: project.id, storage_path: storagePath });

    if (insertError) {
      console.error('share-snapshot insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    return NextResponse.json(
      { url: `${process.env.NEXT_PUBLIC_APP_URL}/s/${token}` },
      { status: 201, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (error) {
    console.error('share-snapshot API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
