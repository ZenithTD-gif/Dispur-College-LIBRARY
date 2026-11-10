'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { GlassToast, type ToastMessage } from '@/components/shared/GlassToast';
import { canManageAdmins, ROLE_LABELS } from '@/lib/validation';
import type { AdminRole, AdminUser } from '@/types/library';

export function TeamManager({
  initialAdmins,
  currentAdminId,
  currentRole,
}: {
  initialAdmins: AdminUser[];
  currentAdminId: string;
  currentRole: AdminRole;
}) {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor'>('admin');
  const [mode, setMode] = useState<'password' | 'invite'>('password');
  const [password, setPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const isSuperAdmin = canManageAdmins(currentRole);

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          mode,
          password: mode === 'password' ? password : undefined,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Could not authorize administrator.');
      }

      setAdmins((prev) => [...prev, payload.admin]);
      const msg =
        mode === 'invite'
          ? `Invitation email sent to ${payload.admin.email}.`
          : `Administrator account created for ${payload.admin.email}.`;
      setSuccessMsg(msg);
      setToast({ id: Date.now(), type: 'success', text: msg });
      setName('');
      setEmail('');
      setPassword('');
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Creation failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(target: AdminUser) {
    setBusyId(target.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/team/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !target.is_active }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to update status.');

      setAdmins((prev) =>
        prev.map((a) => (a.id === target.id ? payload.admin : a))
      );
      setToast({
        id: Date.now(),
        type: 'success',
        text: `${target.name} ${payload.admin.is_active ? 'activated' : 'suspended'}.`,
      });
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      setErrorMsg(msg);
      setToast({ id: Date.now(), type: 'error', text: msg });
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(target: AdminUser, nextRole: 'admin' | 'editor') {
    setBusyId(target.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/team/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to change role.');

      setAdmins((prev) =>
        prev.map((a) => (a.id === target.id ? payload.admin : a))
      );
      setToast({
        id: Date.now(),
        type: 'success',
        text: `Updated ${target.name} role to ${ROLE_LABELS[nextRole]}.`,
      });
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      setErrorMsg(msg);
      setToast({ id: Date.now(), type: 'error', text: msg });
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveAdmin(target: AdminUser) {
    setBusyId(target.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/team/${target.id}`, {
        method: 'DELETE',
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to remove administrator.');

      setAdmins((prev) => prev.filter((a) => a.id !== target.id));
      setToast({
        id: Date.now(),
        type: 'success',
        text: `Removed administrator "${target.name}".`,
      });
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Removal failed.';
      setErrorMsg(msg);
      setToast({ id: Date.now(), type: 'error', text: msg });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <GlassToast toast={toast} onDismiss={() => setToast(null)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-offwhite-300">
          Only authorized administrators listed here can sign in and manage departmental resources.
        </p>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setModalOpen(true);
            }}
            className="glass-btn-primary"
          >
            <UserPlus className="h-4 w-4 text-champagne-200" />
            Add Administrator
          </button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-champagne-300/35 bg-maroon-900/50 p-4 text-xs text-champagne-100 backdrop-blur-xl">
          <Shield className="h-4 w-4 text-champagne-300 shrink-0 mt-0.5" />
          <span>
            You are signed in as <strong>{ROLE_LABELS[currentRole]}</strong>. Only the Primary Admin (Super Admin) can authorize, suspend, or remove other administrator accounts.
          </span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-champagne-300/40 bg-champagne-400/15 p-4 text-sm text-champagne-100 backdrop-blur-xl">
          <CheckCircle2 className="h-5 w-5 text-champagne-300 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !modalOpen && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-wine-400/45 bg-wine-700/25 p-4 text-sm text-rose-100 backdrop-blur-xl"
        >
          <AlertCircle className="h-5 w-5 text-rose-300 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Role Legend */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="liquid-glass p-4">
          <p className="text-xs font-bold text-champagne-200">Primary Admin</p>
          <p className="mt-1 text-xs text-offwhite-300 leading-relaxed">
            Full access including adding/removing other administrators, books, and categories.
          </p>
        </div>
        <div className="liquid-glass p-4">
          <p className="text-xs font-bold text-champagne-200">Department Admin</p>
          <p className="mt-1 text-xs text-offwhite-300 leading-relaxed">
            Can upload, edit, replace files, delete books, control download permissions, and manage categories.
          </p>
        </div>
        <div className="liquid-glass p-4">
          <p className="text-xs font-bold text-champagne-200">Library Curator</p>
          <p className="mt-1 text-xs text-offwhite-300 leading-relaxed">
            Can upload and edit books and categories; cannot permanently delete library books or manage admins.
          </p>
        </div>
      </div>

      {/* Admins Table */}
      <div className="liquid-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-offwhite-100/[0.09] bg-offwhite-100/[0.03] text-[11px] font-semibold uppercase tracking-wider text-champagne-200">
              <tr>
                <th className="px-4 py-3.5">Administrator</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Added</th>
                {isSuperAdmin && <th className="px-4 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-offwhite-100/[0.08]">
              {admins.map((member) => {
                const isSelf = member.id === currentAdminId;
                const isTargetSuper = member.role === 'super_admin';
                const isBusy = busyId === member.id;

                return (
                  <tr key={member.id} className="hover:bg-offwhite-100/[0.04] transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-offwhite-50">
                        {member.name}{' '}
                        {isSelf && (
                          <span className="ml-1 rounded-full border border-champagne-300/35 bg-champagne-400/20 px-2 py-0.5 text-[10px] font-semibold text-champagne-100">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-offwhite-300/75">{member.email}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      {isSuperAdmin && !isSelf && !isTargetSuper ? (
                        <select
                          value={member.role}
                          disabled={isBusy}
                          onChange={(e) =>
                            handleRoleChange(
                              member,
                              e.target.value as 'admin' | 'editor'
                            )
                          }
                          className="liquid-input w-auto py-1.5 px-3 text-xs font-semibold"
                        >
                          <option value="admin">Department Admin</option>
                          <option value="editor">Library Curator</option>
                        </select>
                      ) : (
                        <span className="inline-flex rounded-full border border-champagne-300/30 bg-maroon-900/60 px-2.5 py-0.5 text-[11px] font-semibold text-champagne-200">
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          member.is_active
                            ? 'border-champagne-300/35 bg-champagne-400/20 text-champagne-100'
                            : 'border-wine-400/40 bg-wine-700/25 text-rose-200'
                        }`}
                      >
                        {member.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-offwhite-300/75">
                      {new Date(member.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {isSuperAdmin && (
                      <td className="px-4 py-3.5 text-right">
                        {!isSelf && !isTargetSuper ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleActive(member)}
                              className="glass-btn px-3 py-1 text-xs"
                            >
                              {member.is_active ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRemoveAdmin(member)}
                              className="glass-btn-danger p-1.5 text-xs"
                              title="Remove administrator"
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-offwhite-400">Protected</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Administrator Liquid Glass Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/80 p-4 backdrop-blur-md">
          <div className="liquid-panel animate-modal-pop w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between border-b border-offwhite-100/[0.1] pb-3">
              <h3 className="font-serif text-lg font-bold text-offwhite-50">
                Authorize New Administrator
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1 text-offwhite-300 hover:bg-offwhite-100/[0.1] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-2xl border border-wine-400/45 bg-wine-700/25 p-3 text-xs text-rose-100">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-offwhite-200">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Prof. R. Kalita"
                  className="liquid-input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-offwhite-200">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@dispurcollege.ac.in"
                  className="liquid-input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-offwhite-200">
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'editor')}
                  className="liquid-input"
                >
                  <option value="admin">
                    Department Admin (Full library &amp; deletion rights)
                  </option>
                  <option value="editor">
                    Library Curator (Upload &amp; edit books/categories)
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-offwhite-200">
                  Onboarding Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('password')}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                      mode === 'password'
                        ? 'border-champagne-300/45 bg-gradient-to-r from-maroon-800/85 to-wine-600/80 text-white'
                        : 'border-offwhite-100/[0.15] bg-offwhite-100/[0.05] text-offwhite-300 hover:bg-offwhite-100/[0.1]'
                    }`}
                  >
                    Set Temporary Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('invite')}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                      mode === 'invite'
                        ? 'border-champagne-300/45 bg-gradient-to-r from-maroon-800/85 to-wine-600/80 text-white'
                        : 'border-offwhite-100/[0.15] bg-offwhite-100/[0.05] text-offwhite-300 hover:bg-offwhite-100/[0.1]'
                    }`}
                  >
                    Send Email Invite
                  </button>
                </div>
              </div>

              {mode === 'password' ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-offwhite-200">
                    Temporary Password (min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="liquid-input"
                  />
                </div>
              ) : (
                <p className="liquid-well p-3 text-xs text-offwhite-200">
                  Requires SMTP / Auth email delivery configured in Supabase Project Settings.
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="glass-btn"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="glass-btn-primary">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Authorize Administrator'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

