'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { PasswordInput } from '@/components/ui/password-input';

export default function ProfilePage() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [email, setEmail] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? '');
        setInitialEmail(user.email ?? '');
        setUserId(user.id);
        const fullName =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          '';
        setName(fullName);
        setInitialName(fullName);
        const avatar =
          user.user_metadata?.avatar_url ??
          user.user_metadata?.picture ??
          null;
        setAvatarUrl(avatar);
        setHasPassword((user.identities ?? []).some((i) => i.provider === 'email'));
      }
      setLoading(false);
    });
  }, []);

  function closePasswordModal() {
    setShowPasswordModal(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setModalError('');
  }

  async function handleSetPasswordAndContinue(e: React.FormEvent) {
    e.preventDefault();
    setModalError('');
    if (!newPassword || !confirmNewPassword) return;
    if (newPassword !== confirmNewPassword) {
      setModalError('Passwords do not match');
      return;
    }

    setSettingPassword(true);
    const supabase = createClient();
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    if (pwError) {
      setSettingPassword(false);
      setModalError(pwError.message);
      return;
    }
    setHasPassword(true);

    await supabase.auth.updateUser({ data: { full_name: name } });
    setInitialName(name);
    const { error: emailError } = await supabase.auth.updateUser({ email });
    setSettingPassword(false);

    if (emailError) {
      setModalError(emailError.message);
      return;
    }

    closePasswordModal();
    setIsEditingEmail(false);
    toast('Password set — confirmation link sent to finish changing your email.');
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast('File must be under 2MB.', 'error');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast('Only JPG, PNG, GIF or WebP allowed.', 'error');
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      setAvatarUrl(publicUrl);
      toast('Avatar updated');
    } catch {
      // Fallback: show local preview even if storage isn't set up
      const localUrl = URL.createObjectURL(file);
      setAvatarUrl(localUrl);
    } finally {
      setUploading(false);
      // Reset so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    const res = await fetch('/api/user/delete', { method: 'DELETE' });
    if (!res.ok) {
      const { error } = await res.json();
      toast(error ?? 'Failed to delete account.', 'error');
      setDeleting(false);
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const emailChanged = email !== initialEmail;

    if (emailChanged && !hasPassword) {
      setShowPasswordModal(true);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { full_name: name } });
    setInitialName(name);

    if (emailChanged) {
      const { error } = await supabase.auth.updateUser({ email });
      setSaving(false);
      if (error) {
        toast(error.message, 'error');
        return;
      }
      setIsEditingEmail(false);
      toast('Confirmation link sent — check your inbox to finish changing your email.');
      return;
    }

    setSaving(false);
    toast('Profile saved');
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#111111] mb-1">Profile</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your personal information.</p>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Avatar</h2>
          <div className="flex items-center gap-5">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#fff3f0] flex items-center justify-center text-2xl font-bold text-[#111111] shrink-0">
                {loading ? '…' : (name || email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || loading}
                className="text-sm font-medium text-[#ff724f] hover:text-[#ff724f] border border-[#ff724f]/30 px-4 py-2 rounded-lg hover:bg-[#fff3f0] transition-colors disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Upload photo'}
              </button>
              <p className="text-xs text-gray-400 mt-1.5">JPG, PNG or GIF. Max 2MB.</p>
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Personal information</h2>
          {loading ? (
            <div className="h-20 flex items-center justify-center text-sm text-gray-400">Loading…</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Work email</label>
                {isEditingEmail ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {email}{' '}
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(true)}
                      className="text-[#ff724f] font-medium hover:text-[#e8603a]"
                    >
                      Change email
                    </button>
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving || (name === initialName && email === initialEmail)}
                  className="bg-[#ff724f] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#e8603a] transition-colors disabled:opacity-60 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Set password to continue email change */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={closePasswordModal} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
              <button
                onClick={closePasswordModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#fff3f0] rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#ff724f] text-[20px]">lock</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Set a password to continue</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                Your account uses Google sign-in only. Set a password now and we&apos;ll go ahead with your email change to <strong className="text-gray-700">{email}</strong> right after.
              </p>

              <form onSubmit={handleSetPasswordAndContinue} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">New password</label>
                  <PasswordInput
                    value={newPassword}
                    onChange={setNewPassword}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <PasswordInput
                    value={confirmNewPassword}
                    onChange={setConfirmNewPassword}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                  />
                </div>

                {modalError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{modalError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    className="flex-1 border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={settingPassword}
                    className="flex-1 bg-[#ff724f] hover:bg-[#e8603a] text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-60"
                  >
                    {settingPassword ? 'Setting…' : 'Set password & continue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="bg-white border border-red-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-red-700 mb-1">Delete account</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => { setDeleteOpen(true); setDeleteConfirm(''); }}
            className="text-sm font-medium text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete my account
          </button>

          {deleteOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteOpen(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Delete Account</h2>
                    <p className="text-sm text-gray-500">This action cannot be undone.</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Your account and all associated data will be permanently deleted. Type your email address to confirm.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <strong>{email}</strong> to confirm
                  </label>
                  <input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={email}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteOpen(false)}
                    className="flex-1 border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== email || deleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete Account'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
