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
      setSuccessMsg(
        mode === 'invite'
          ? `Invitation email sent to ${payload.admin.email}.`
          : `Administrator account created for ${payload.admin.email}.`
      );
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
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Update failed.');
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
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Update failed.');
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
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Removal failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Only authorized administrators listed here can sign in and manage departmental resources.
        </p>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            <UserPlus className="h-4 w-4 text-gold-300" />
            Add Administrator
          </button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="flex items-start gap-2.5 rounded-xl border border-gold-300 bg-gold-100/50 p-4 text-xs text-navy-900">
          <Shield className="h-4 w-4 text-gold-700 shrink-0 mt-0.5" />
          <span>
            You are signed in as <strong>{ROLE_LABELS[currentRole]}</strong>. Only the Primary Admin (Super Admin) can authorize, suspend, or remove other administrator accounts.
          </span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !modalOpen && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Role Legend */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="academic-card p-4">
          <p className="text-xs font-bold text-navy-900">Primary Admin</p>
          <p className="mt-1 text-xs text-slate-600">
            Full access including adding/removing other administrators, books, and categories.
          </p>
        </div>
        <div className="academic-card p-4">
          <p className="text-xs font-bold text-navy-900">Department Admin</p>
          <p className="mt-1 text-xs text-slate-600">
            Can upload, edit, replace files, delete books, control download permissions, and manage categories.
          </p>
        </div>
        <div className="academic-card p-4">
          <p className="text-xs font-bold text-navy-900">Library Curator</p>
          <p className="mt-1 text-xs text-slate-600">
            Can upload and edit books and categories; cannot permanently delete library books or manage admins.
          </p>
        </div>
      </div>

      {/* Admins Table */}
      <div className="academic-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-parchment-300 bg-parchment-100/80 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Administrator</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Added</th>
                {isSuperAdmin && <th className="px-4 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-200">
              {admins.map((member) => {
                const isSelf = member.id === currentAdminId;
                const isTargetSuper = member.role === 'super_admin';
                const isBusy = busyId === member.id;

                return (
                  <tr key={member.id} className="hover:bg-ivory-200/60">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-navy-900">
                        {member.name}{' '}
                        {isSelf && (
                          <span className="ml-1 rounded bg-navy-100 px-1.5 py-0.5 text-[10px] font-semibold text-navy-800">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{member.email}</p>
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
                          className="rounded-lg border border-parchment-400 bg-white px-2.5 py-1 text-xs font-semibold text-navy-900"
                        >
                          <option value="admin">Department Admin</option>
                          <option value="editor">Library Curator</option>
                        </select>
                      ) : (
                        <span className="inline-flex rounded-full bg-navy-900 px-2.5 py-0.5 text-[11px] font-semibold text-gold-300">
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          member.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {member.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
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
                              className="rounded-lg border border-parchment-300 bg-white px-2.5 py-1 text-xs font-semibold text-navy-900 hover:bg-parchment-100"
                            >
                              {member.is_active ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRemoveAdmin(member)}
                              className="rounded-lg border border-red-200 bg-white p-1.5 text-red-700 hover:bg-red-50"
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
                          <span className="text-xs text-slate-400">Protected</span>
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

      {/* Add Administrator Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-parchment-300 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-parchment-200 pb-3">
              <h3 className="font-serif text-lg font-bold text-navy-900">
                Authorize New Administrator
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-parchment-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-800">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Prof. R. Kalita"
                  className="input-academic"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-800">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@dispurcollege.ac.in"
                  className="input-academic"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-800">
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'editor')}
                  className="input-academic"
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
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-800">
                  Onboarding Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('password')}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      mode === 'password'
                        ? 'border-navy-900 bg-navy-900 text-white'
                        : 'border-parchment-300 bg-white text-navy-900'
                    }`}
                  >
                    Set Temporary Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('invite')}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      mode === 'invite'
                        ? 'border-navy-900 bg-navy-900 text-white'
                        : 'border-parchment-300 bg-white text-navy-900'
                    }`}
                  >
                    Send Email Invite
                  </button>
                </div>
              </div>

              {mode === 'password' ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-800">
                    Temporary Password (min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="input-academic"
                  />
                </div>
              ) : (
                <p className="rounded-lg border border-parchment-300 bg-ivory-200 p-3 text-xs text-slate-600">
                  Requires SMTP / Auth email delivery configured in Supabase Project Settings.
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
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

