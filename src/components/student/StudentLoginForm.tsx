'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export function StudentLoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/student/dashboard';
  const urlMessage = searchParams.get('registered')
    ? 'Registration complete! Please sign in with your email and password.'
    : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(urlMessage);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setErrorMessage('Library backend is not configured yet.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setErrorMessage(
          signInError.message || 'Invalid student email address or password.'
        );
        setSubmitting(false);
        return;
      }

      // Verify this authenticated user is an active registered student
      const verifyRes = await fetch('/api/student/dashboard', {
        cache: 'no-store',
      });

      if (!verifyRes.ok) {
        await supabase.auth.signOut();
        const errPayload = await verifyRes.json().catch(() => null);
        setErrorMessage(
          errPayload?.error ||
            'Your account is not registered as an active student. If you are an administrator, please use the Admin Portal.'
        );
        setSubmitting(false);
        return;
      }

      const safeNext =
        nextPath.startsWith('/student') && nextPath !== '/student/login'
          ? nextPath
          : '/student/dashboard';

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {infoMessage && (
        <div
          role="status"
          className="rounded-2xl border border-champagne-300/40 bg-champagne-400/10 p-3.5 text-xs text-champagne-100 flex items-start gap-2.5 backdrop-blur-xl"
        >
          <GraduationCap className="h-4 w-4 shrink-0 text-champagne-300 mt-0.5" />
          <p className="leading-relaxed">{infoMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border border-wine-400/45 bg-wine-700/20 p-3.5 text-xs text-rose-200 flex items-start gap-2.5 backdrop-blur-xl"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-300 mt-0.5" />
          <p className="leading-relaxed">{errorMessage}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="student-email"
          className="block text-xs font-semibold text-offwhite-200 mb-1.5"
        >
          Student Email Address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
          <input
            id="student-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@dispurcollege.ac.in"
            className="liquid-input pl-10"
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="student-password"
            className="block text-xs font-semibold text-offwhite-200"
          >
            Password
          </label>
          <Link
            href="/student/forgot-password"
            className="text-xs font-medium text-champagne-300 hover:text-champagne-200 transition-colors"
          >
            Forgot Password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
          <input
            id="student-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="liquid-input pl-10 pr-10"
            disabled={submitting}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-offwhite-400 hover:text-offwhite-200 p-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="glass-btn-primary w-full py-2.5 text-sm font-semibold mt-2"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-champagne-200" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <GraduationCap className="h-4 w-4 text-champagne-200" />
            <span>Sign In to Student Portal</span>
          </>
        )}
      </button>

      <div className="pt-2 text-center">
        <p className="text-xs text-offwhite-300">
          New student?{' '}
          <Link
            href="/student/register"
            className="font-semibold text-champagne-300 hover:text-champagne-200 underline underline-offset-2"
          >
            Register Student Account
          </Link>
        </p>
      </div>
    </form>
  );
}

