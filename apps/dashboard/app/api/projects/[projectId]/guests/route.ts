import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  // Verify caller is a member of the org that owns this project
  const { data: project } = await service
    .from('projects')
    .select('organisation_id')
    .eq('id', projectId)
    .single();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: membership } = await service
    .from('members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organisation_id', project.organisation_id)
    .not('accepted_at', 'is', null)
    .single();
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await service
    .from('project_guests')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { email, name } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const supabase = await createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  // Verify project belongs to caller's org
  const { data: project } = await service
    .from('projects')
    .select('id, name, organisation_id')
    .eq('id', projectId)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: membership } = await service
    .from('members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organisation_id', project.organisation_id)
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only owners and admins can invite guests' }, { status: 403 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: guest, error } = await service.from('project_guests').upsert(
    { project_id: projectId, email, name: name || null, token, expires_at: expiresAt, invited_by: user.id, accepted_at: null },
    { onConflict: 'project_id,email' }
  ).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/guest/accept?token=${token}`;

  // Send invite email
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && !resendKey.includes('your-key')) {
    try {
      const resend = new Resend(resendKey);
      const { error: emailError } = await resend.emails.send({
        from: 'Pinmarks <noreply@pinmarks.in>',
        to: email,
        subject: `You've been invited to view ${project.name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <div style="background: #111111; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #ff724f; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 4px;">Pinmarks</p>
              <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">Feedback</p>
            </div>
            <h2 style="color: #111111; font-size: 20px; font-weight: 700; margin: 0 0 8px;">You've been invited as a guest</h2>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
              You've been given <strong>guest access</strong> to view feedback for the project:
            </p>
            <p style="color: #111111; font-size: 16px; font-weight: 600; margin: 0 0 24px;">${project.name}</p>
            <a href="${inviteUrl}" style="background: #ff724f; color: #111111; padding: 12px 24px; border-radius: 10px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 14px;">
              View Project
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This link expires in 30 days.</p>
            <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">Pinmarks by Pinmarks</p>
          </div>
        `,
      });
      if (emailError) console.error('[Guest invite email error]', emailError);
    } catch (err) { console.error('[Guest invite email exception]', err); }
  }

  return NextResponse.json({ data: { ...guest, inviteUrl } });
}
