'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Lock,
} from 'lucide-react';
import { DispurCollegeLogo } from '@/components/shared/DispurCollegeLogo';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function StudentUpdatePasswordPage() {
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

        // 1. Handle implicit invite/recovery hash tokens
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

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
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
        setErrorMsg(error.message || 'Failed to update student password.');
        setSubmitting(false);
        return;
      }

      setSuccessMsg('Your password has been updated! Redirecting to student dashboard...');
      setTimeout(() => {
        router.push('/student/dashboard');
        router.refresh();
      }, 1500);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'An error occurred while updating your password.'
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 animate-float-slow rounded-full bg-maroon-700/35 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-burgundy-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-12 h-80 w-80 rounded-full bg-champagne-400/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md">
        <Link href="/student/dashboard" className="glass-btn group px-3.5 py-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="animate-page-enter relative mx-auto w-full max-w-md space-y-6 my-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <DispurCollegeLogo size="lg" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-champagne-300">
            Dispur College, Assam
          </p>
          <h1 className="font-serif text-2xl font-bold text-offwhite-50 sm:text-3xl">
            Update Student Password
          </h1>
          <p className="text-xs text-offwhite-300">
            Enter a new password for your student library account.
          </p>
        </div>

        <div className="liquid-glass p-6 sm:p-8">
          {checkingSession ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-champagne-300" />
              <p className="text-xs text-offwhite-300">Validating authorization session...</p>
            </div>
          ) : !hasSession ? (
            <div className="space-y-4 py-2">
              <div
                role="alert"
                className="rounded-2xl border border-wine-400/45 bg-wine-700/20 p-4 text-xs text-rose-200 flex items-start gap-3 backdrop-blur-xl"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-300" />
                <div>
                  <p className="font-semibold text-offwhite-50">Session Expired or Missing</p>
                  <p className="mt-1 leading-relaxed">
                    The password reset link has expired or has already been used. Please request a new password reset link.
                  </p>
                </div>
              </div>
              <Link href="/student/forgot-password" className="glass-btn-primary w-full py-2.5 text-xs">
                Request New Password Reset Link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-2xl border border-wine-400/45 bg-wine-700/20 p-3.5 text-xs text-rose-200 flex items-start gap-2.5 backdrop-blur-xl"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-300 mt-0.5" />
                  <p className="leading-relaxed">{errorMsg}</p>
                </div>
              )}

              {successMsg && (
                <div
                  role="status"
                  className="rounded-2xl border border-emerald-500/40 bg-emerald-900/25 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5 backdrop-blur-xl"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <p className="leading-relaxed">{successMsg}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="new-pwd"
                  className="block text-xs font-semibold text-offwhite-200 mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
                  <input
                    id="new-pwd"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="liquid-input pl-10"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-pwd"
                  className="block text-xs font-semibold text-offwhite-200 mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
                  <input
                    id="confirm-pwd"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="liquid-input pl-10"
                    disabled={submitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="glass-btn-primary w-full py-2.5 text-sm font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-champagne-200" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-4 w-4 text-champagne-200" />
                    <span>Save New Password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="relative text-center text-xs text-offwhite-300/70">
        Professional Studies Department • Dispur College
      </p>
    </div>
  );
}

