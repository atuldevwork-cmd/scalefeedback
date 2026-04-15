import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { writeAuditLog } from '@/lib/audit';

const VALID_ROLES = ['admin', 'member'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const supabase = await createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { role } = await req.json();
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { data: callerRows } = await service
    .from('members')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('accepted_at', { ascending: false });
  const callerMembership = callerRows?.find((m) => m.role !== 'owner') ?? callerRows?.[0] ?? null;

  if (!callerMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  if (!['owner', 'admin'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Only owners and admins can change roles' }, { status: 403 });
  }

  const { data: target } = await service
    .from('members')
    .select('id, role, organisation_id')
    .eq('id', memberId)
    .eq('organisation_id', callerMembership.organisation_id)
    .single();

  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (target.role === 'owner') return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 });

  const { error } = await service.from('members').update({ role }).eq('id', memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  writeAuditLog(service, {
    organisation_id: callerMembership.organisation_id,
    actor_id: user.id,
    action: 'member.role_changed',
    target_type: 'member',
    target_id: memberId,
    details: { previous_role: target.role, new_role: role },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;

  const supabase = await createClient();
  const service = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  // Get the caller's membership — mirror the same org-selection logic as the page:
  // filter to accepted memberships, prefer non-owner (invited admin) over owned org
  const { data: callerDeleteRows } = await service
    .from('members')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('accepted_at', { ascending: false });
  const callerMembership = callerDeleteRows?.find((m) => m.role !== 'owner') ?? callerDeleteRows?.[0] ?? null;

  if (!callerMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  if (!['owner', 'admin'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 });
  }

  // Get the target member
  const { data: target } = await service
    .from('members')
    .select('id, user_id, role, organisation_id')
    .eq('id', memberId)
    .eq('organisation_id', callerMembership.organisation_id)
    .single();

  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // Cannot remove the owner
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the workspace owner' }, { status: 403 });
  }

  // Cannot remove yourself
  if (target.user_id === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 403 });
  }

  // Get target user's email for the notification
  const { data: usersData } = await service.auth.admin.listUsers();
  const targetUser = usersData?.users.find((u) => u.id === target.user_id);
  const targetEmail = targetUser?.email;

  // Get org name
  const { data: org } = await service
    .from('organisations')
    .select('name')
    .eq('id', callerMembership.organisation_id)
    .single();

  // Remove the member
  const { error } = await service.from('members').delete().eq('id', memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  writeAuditLog(service, {
    organisation_id: callerMembership.organisation_id,
    actor_id: user.id,
    action: 'member.removed',
    target_type: 'member',
    target_id: memberId,
    details: { removed_email: targetEmail ?? null, removed_role: target.role },
  });

  // Send removal email if Resend configured
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && !resendKey.includes('your_key') && targetEmail) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'ScaleFeedback <onboarding@resend.dev>',
        to: targetEmail,
        subject: `You've been removed from ${org?.name ?? 'a ScaleFeedback workspace'}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <div style="background: #300a46; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #ff724f; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 4px;">ScaleStation</p>
              <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">Feedback</p>
            </div>
            <h2 style="color: #300a46; font-size: 20px; font-weight: 700; margin: 0 0 8px;">Workspace access removed</h2>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
              You've been removed from the workspace <strong style="color: #300a46;">${org?.name ?? 'ScaleFeedback'}</strong>.
              You no longer have access to its projects and feedback.
            </p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              If you believe this was a mistake, please contact your workspace administrator.
            </p>
            <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              ScaleFeedback by ScaleStation
            </p>
          </div>
        `,
      });
    } catch { /* email failure is non-fatal */ }
  }

  return NextResponse.json({ success: true });
}
