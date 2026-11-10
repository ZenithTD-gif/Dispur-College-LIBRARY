'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/admin';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    urlError === 'unauthorized'
      ? 'Your account is not authorized as an active library administrator.'
      : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setErrorMessage('Supabase environment variables are not configured yet.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();

      if (resetMode) {
        const redirectTo = `${window.location.origin}/auth/callback?next=/admin/update-password`;
        await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo,
        });
        setInfoMessage(
          'If an authorized administrator account matches that email, a password reset link has been sent.'
        );
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid administrator email or password.');
        setSubmitting(false);
        return;
      }

      // Verify this authenticated account is an active row in admin_users
      const verifyRes = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (!verifyRes.ok) {
        await supabase.auth.signOut();
        const errPayload = await verifyRes.json().catch(() => null);
        setErrorMessage(
          errPayload?.error ||
            'Your account does not have active administrator privileges.'
        );
        setSubmitting(false);
        return;
      }

      const safeNext =
        nextPath.startsWith('/admin') && nextPath !== '/admin/login' ? nextPath : '/admin';
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-wine-400/45 bg-wine-700/25 px-3.5 py-3 text-xs text-rose-100 backdrop-blur-xl"
        >
          <AlertCircle className="h-4 w-4 text-rose-300 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {infoMessage && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-champagne-300/40 bg-champagne-400/15 px-3.5 py-3 text-xs text-champagne-100 backdrop-blur-xl">
          <CheckCircle2 className="h-4 w-4 text-champagne-300 shrink-0 mt-0.5" />
          <span>{infoMessage}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="admin-email"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-offwhite-200"
        >
          Administrator Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-offwhite-300/75" />
          <input
            id="admin-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@dispurcollege.ac.in"
            disabled={!configured || submitting}
            className="liquid-input pl-10"
          />
        </div>
      </div>

      {!resetMode && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold uppercase tracking-wider text-offwhite-200"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                setResetMode(true);
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className="text-[11px] font-semibold text-champagne-300 hover:text-white transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-offwhite-300/75" />
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={!configured || submitting}
              className="liquid-input pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-offwhite-300/75 hover:text-white transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!configured || submitting}
        className="glass-btn-primary w-full py-3 text-sm"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {resetMode ? 'Sending reset link...' : 'Signing in...'}
          </>
        ) : resetMode ? (
          'Send Password Reset Link'
        ) : (
          'Sign In to Admin Portal'
        )}
      </button>

      {resetMode && (
        <button
          type="button"
          onClick={() => {
            setResetMode(false);
            setErrorMessage(null);
            setInfoMessage(null);
          }}
          className="w-full text-center text-xs font-semibold text-champagne-300 hover:text-white transition-colors"
        >
          Back to Sign In
        </button>
      )}
    </form>
  );
}

