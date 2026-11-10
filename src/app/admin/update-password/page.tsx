'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function UpdateAdminPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      if (!isSupabaseConfigured()) {
        setCheckingSession(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        // 1. Handle implicit invite/recovery hash tokens (#access_token=...&refresh_token=...)
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            window.history.replaceState(null, '', window.location.pathname);
          }
        }

        // 2. Handle PKCE code or token_hash query parameters if present
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          window.history.replaceState(null, '', window.location.pathname);
        } else if (tokenHash && type) {
          await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'invite' | 'recovery' | 'email',
          });
          window.history.replaceState(null, '', window.location.pathname);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        setHasSession(Boolean(session));
      } catch {
        setHasSession(false);
      } finally {
        setCheckingSession(false);
      }
    }

    checkAuth();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      setSuccessMsg('Password updated successfully! Redirecting to Admin Dashboard...');
      setTimeout(() => {
        router.push('/admin');
        router.refresh();
      }, 1200);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to update password.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -top-28 left-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-burgundy-700/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md">
        <Link
          href={hasSession ? '/admin' : '/admin/login'}
          className="glass-btn group px-3.5 py-1.5 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          {hasSession ? 'Back to Admin Dashboard' : 'Back to Admin Sign-In'}
        </Link>
      </div>

      <div className="relative mx-auto w-full max-w-md space-y-6 my-8">
        <div className="text-center space-y-2.5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-gradient-to-br from-blue-500/35 via-amethyst-500/30 to-burgundy-700/40 text-white shadow-[0_12px_28px_-6px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl">
            <BookMarked className="h-6 w-6 text-amethyst-300" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">
            Set Administrator Password
          </h1>
          <p className="text-xs text-slate-300">
            Complete your invitation or password reset for Dispur College Digital Library
          </p>
        </div>

        <div className="liquid-glass p-6 sm:p-8">
          {checkingSession ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-xs text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin text-amethyst-400" />
              Verifying administrator session...
            </div>
          ) : !hasSession ? (
            <div className="space-y-4 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-300" />
              <p className="text-sm font-semibold text-white">
                Verification Link Required or Expired
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Open this page from a valid administrator invitation or password
                reset email link, or request a new reset link on the login page.
              </p>
              <Link href="/admin/login" className="glass-btn-primary w-full">
                Go to Admin Sign-In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="flex items-start gap-2 rounded-2xl border border-rose-400/35 bg-rose-500/15 p-3 text-xs text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-300" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-start gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 p-3 text-xs text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-300" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  New Password (min 8 chars)
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="liquid-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="liquid-input pl-10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="glass-btn-primary w-full py-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Password & Continue'
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="relative text-center text-xs text-slate-400">
        Professional Studies Department • Dispur College
      </p>
    </div>
  );
}

