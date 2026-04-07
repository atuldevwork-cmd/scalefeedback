'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import type { PendingInvitation } from './page';

interface Member {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-[#ff724f] bg-[#fff3f0]',
  admin: 'text-blue-700 bg-blue-50',
  member: 'text-gray-600 bg-gray-100',
};

function formatExpiry(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}

function Avatar({ name, email }: { name: string; email: string }) {
  const letter = (name || email || '?').charAt(0).toUpperCase();
  const colors = [
    'bg-[#fff3f0] text-[#ff724f]',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
  ];
  const color = colors[letter.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${color}`}>
      {letter}
    </div>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [inviteUrl, setInviteUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send invitation');
      setInviteUrl(data.data?.inviteUrl ?? '');
      setStatus('sent');
      onInvited();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send invitation', 'error');
      setStatus('idle');
    }
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#300a46]/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 mx-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-[#fff3f0] rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ff724f] text-[18px]">person_add</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#300a46]">Invite team member</h2>
            <p className="text-xs text-gray-500">They&apos;ll receive an email with a link to join.</p>
          </div>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {status === 'sent' && inviteUrl ? (
          <div className="py-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
              </div>
              <div>
                <p className="font-semibold text-[#300a46] text-sm">Invitation created!</p>
                <p className="text-xs text-gray-500 mt-0.5">An invite email was sent to <strong>{email}</strong>.</p>
              </div>
            </div>
            {inviteUrl && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Share invite link directly</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 font-mono truncate">
                    {inviteUrl}
                  </div>
                  <button
                    onClick={copyInviteLink}
                    className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg shrink-0 transition-all ${linkCopied ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="material-symbols-outlined text-[13px]">{linkCopied ? 'check' : 'content_copy'}</span>
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
            <button onClick={onClose} className="w-full bg-[#ff724f] hover:bg-[#e8603a] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" required
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-all">
                Cancel
              </button>
              <button type="submit" disabled={status === 'loading'} className="flex-1 bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-60 transition-all shadow-sm">
                {status === 'loading' ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ChangeRoleModal({ member, onClose, onChanged }: {
  member: Member;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [role, setRole] = useState(member.role === 'admin' ? 'member' : 'admin');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to update role');
      }
      toast('Role updated successfully');
      onChanged();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update role', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#300a46]/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 mx-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600 text-[18px]">manage_accounts</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#300a46]">Change role</h2>
            <p className="text-xs text-gray-500">{member.name || member.email}</p>
          </div>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">New role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-xs text-gray-400 mt-2">
            {role === 'admin' ? 'Admins can invite members, manage projects, and update feedback.' : 'Members can view and manage feedback but cannot invite or remove others.'}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || role === member.role}
            className="flex-1 bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-60 transition-all shadow-sm">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RemoveConfirmModal({ member, onConfirm, onClose, removing }: {
  member: Member;
  onConfirm: () => void;
  onClose: () => void;
  removing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#300a46]/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 mx-4">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-red-500 text-[24px]">person_remove</span>
        </div>
        <h2 className="text-base font-bold text-[#300a46] text-center mb-2">Remove member?</h2>
        <p className="text-sm text-gray-500 text-center mb-1">
          <strong className="text-gray-700">{member.name || member.email}</strong> will lose access to this workspace immediately.
        </p>
        {member.email && (
          <p className="text-xs text-gray-400 text-center mb-5">
            They will receive an email notification.
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={removing}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-2">
            {removing && <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>}
            {removing ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberMenu({ member, onRemove, onChangeRole }: { member: Member; onRemove: () => void; onChangeRole: () => void }) {
  const [open, setOpen] = useState(false);

  if (member.role === 'owner') return <div className="w-8" />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-gray-300 hover:text-gray-500 p-1 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">more_vert</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-44">
            <button
              onClick={() => { setOpen(false); onChangeRole(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
              Change role
            </button>
            <button
              onClick={() => { setOpen(false); onRemove(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">person_remove</span>
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function MembersClient({
  members,
  inviteLink,
  pendingInvitations,
  currentUserRole,
  currentUserId = '',
}: {
  members: Member[];
  inviteLink: string;
  pendingInvitations: PendingInvitation[];
  currentUserRole: string;
  currentUserId?: string;
}) {
  const toast = useToast();
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);
  const [changeRoleTarget, setChangeRoleTarget] = useState<Member | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  function copyLink() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/members/${removeTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to remove member');
      }
      toast('Member removed');
      setRemoveTarget(null);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to remove member', 'error');
    } finally {
      setRemoving(false);
    }
  }

  async function handleRevoke(invitationId: string) {
    setRevokingId(invitationId);
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to revoke invitation');
      }
      toast('Invitation revoked');
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to revoke invitation', 'error');
    } finally {
      setRevokingId(null);
    }
  }

  const filtered = members.filter((m) => {
    const matchRole = roleFilter === 'all' || m.role === roleFilter;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#300a46]">Members</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {members.length} active member{members.length !== 1 ? 's' : ''}
          {pendingInvitations.length > 0 && ` · ${pendingInvitations.length} pending`}
        </p>
      </div>

      {/* Secret invite link — admins/owners only */}
      {canManage && (
        <div className="bg-[#fff3f0]/60 border border-[#ff724f]/20 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <span className="material-symbols-outlined text-[#ff724f] text-[20px] mt-0.5">link</span>
            <div>
              <p className="text-sm font-semibold text-[#300a46]">Secret invite link</p>
              <p className="text-xs text-gray-500 mt-0.5">Share this link — anyone who opens it can sign up and join your workspace.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 font-mono truncate">
              {inviteLink}
            </div>
            <button onClick={copyLink}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl shrink-0 transition-all ${copied ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="appearance-none border border-gray-200 rounded-xl pl-3 pr-7 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] cursor-pointer transition-all">
            <option value="all">Everyone</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[16px]">expand_more</span>
        </div>

        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all" />
        </div>

        <span className="text-sm text-gray-400">{members.length + pendingInvitations.length} total</span>
        <div className="flex-1" />
        {canManage && (
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-[#ff724f] hover:bg-[#e8603a] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm">
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Invite users
          </button>
        )}
      </div>

      {/* Active members */}
      <div className="border border-gray-100 rounded-2xl bg-white shadow-card mb-4">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No members found.</div>
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              {filtered.map((m) => {
                const isYou = m.user_id === currentUserId;
                return (
                  <tr key={m.id} className={`transition-colors ${isYou ? 'bg-[#fff9f8]' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} email={m.email} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#300a46] truncate">{m.name || m.email}</span>
                            {isYou && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#ff724f] text-white shrink-0">
                                you
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[m.role] ?? 'text-gray-600 bg-gray-100'}`}>
                        {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 w-10 text-right">
                      {canManage && !isYou && <MemberMenu member={m} onRemove={() => setRemoveTarget(m)} onChangeRole={() => setChangeRoleTarget(m)} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending invitations — admins/owners only */}
      {canManage && pendingInvitations.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Pending invitations ({pendingInvitations.length})
          </h2>
          <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-card">
            <table className="w-full">
              <tbody className="divide-y divide-gray-50">
                {pendingInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-gray-400 text-[18px]">mail</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-700 truncate">{inv.email}</div>
                          <div className="text-xs text-gray-400">Expires {formatExpiry(inv.expires_at)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700">Pending</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[inv.role] ?? 'text-gray-600 bg-gray-100'}`}>
                        {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 w-10 text-right">
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revokingId === inv.id}
                        className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                        title="Revoke invitation"
                      >
                        {revokingId === inv.id ? '…' : 'Revoke'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={() => router.refresh()} />}
      {changeRoleTarget && (
        <ChangeRoleModal
          member={changeRoleTarget}
          onClose={() => setChangeRoleTarget(null)}
          onChanged={() => router.refresh()}
        />
      )}
      {removeTarget && (
        <RemoveConfirmModal
          member={removeTarget}
          onConfirm={handleRemove}
          onClose={() => { setRemoveTarget(null); }}
          removing={removing}
        />
      )}
    </div>
  );
}
