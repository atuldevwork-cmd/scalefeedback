'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';

export function InviteMemberForm() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to send invitation');
      }
      toast('Invitation sent to ' + email);
      setEmail('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send invitation', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="colleague@company.com"
        required
        className="flex-1 min-w-48 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="bg-[#ff724f] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#e8603a] disabled:opacity-60 transition-colors"
      >
        {loading ? 'Sending…' : 'Send Invite'}
      </button>
    </form>
  );
}
