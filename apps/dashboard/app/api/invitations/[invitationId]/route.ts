import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await params;

  const supabase = await createClient();
  const service = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  // Verify caller is owner or admin
  const { data: callerMembership } = await service
    .from('members')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .single();

  if (!callerMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  if (!['owner', 'admin'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Only owners and admins can revoke invitations' }, { status: 403 });
  }

  // Ensure invitation belongs to caller's org
  const { data: invitation } = await service
    .from('invitations')
    .select('id, organisation_id')
    .eq('id', invitationId)
    .eq('organisation_id', callerMembership.organisation_id)
    .single();

  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });

  const { error } = await service.from('invitations').delete().eq('id', invitationId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
