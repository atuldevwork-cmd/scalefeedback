import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/mock-data';
import { Resend } from 'resend';
import { writeAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const { email, role } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  // If Supabase not configured, just simulate success
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: { email, role, status: 'invited (demo)' } });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  // Get user's org
  const { data: membership } = await supabase
    .from('members')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) return NextResponse.json({ error: 'Not a member of any org' }, { status: 403 });
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only owners and admins can invite' }, { status: 403 });
  }

  // Create invitation record
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('invitations').upsert(
    {
      organisation_id: membership.organisation_id,
      email,
      role,
      token,
      expires_at: expiresAt,
      created_by: user.id,
      accepted_at: null,
    },
    { onConflict: 'organisation_id,email' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const service = createServiceClient();
  writeAuditLog(service, {
    organisation_id: membership.organisation_id,
    actor_id: user.id,
    action: 'member.invited',
    target_type: 'invitation',
    target_id: email,
    details: { email, role },
  });

  // Send invite email if Resend configured
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && !resendKey.includes('your-key')) {
    try {
      const resend = new Resend(resendKey);
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${token}`;
      const { error: emailError } = await resend.emails.send({
        from: 'ScaleFeedback <onboarding@resend.dev>',
        to: email,
        subject: "You've been invited to ScaleFeedback",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <div style="background: #300a46; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #ff724f; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 4px;">ScaleStation</p>
              <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">Feedback</p>
            </div>
            <h2 style="color: #300a46; font-size: 20px; font-weight: 700; margin: 0 0 8px;">You've been invited!</h2>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              You've been invited to join a ScaleFeedback workspace as <strong style="color: #300a46;">${role}</strong>.
              Click the button below to accept.
            </p>
            <a href="${inviteUrl}" style="background: #ff724f; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 14px;">
              Accept Invitation
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This link expires in 7 days.</p>
            <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">ScaleFeedback by ScaleStation</p>
          </div>
        `,
      });
      if (emailError) console.error('[Invite email error]', emailError);
    } catch (err) { console.error('[Invite email exception]', err); }
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${token}`;
  return NextResponse.json({ data: { email, role, inviteUrl } });
}
