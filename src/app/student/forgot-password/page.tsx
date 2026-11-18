'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Mail,
} from 'lucide-react';
import { DispurCollegeLogo } from '@/components/shared/DispurCollegeLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function StudentForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/student/update-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      );

      if (error) {
        setErrorMessage(error.message || 'Unable to send password reset link.');
        setSubmitting(false);
        return;
      }

      setSuccessMessage(
        'If a student account is registered with this email, a password reset link has been sent. Please check your inbox and spam folder.'
      );
      setSubmitting(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to request password reset.'
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden px-4 py-10 sm:px-6">
      {/* Ambient Depth Orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 animate-float-slow rounded-full bg-maroon-700/35 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-burgundy-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-12 h-80 w-80 rounded-full bg-champagne-400/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md">
        <Link href="/student/login" className="glass-btn group px-3.5 py-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Back to Student Login</span>
        </Link>
      </div>

      <div className="animate-page-enter relative mx-auto w-full max-w-md space-y-6 my-8">
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            <DispurCollegeLogo size="lg" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-champagne-300">
            Dispur College, Assam
          </p>
          <h1 className="font-serif text-2xl font-bold text-offwhite-50 sm:text-3xl">
            Reset Student Password
          </h1>
          <p className="text-xs text-offwhite-300">
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

        <div className="liquid-glass p-6 sm:p-8">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-2xl border border-wine-400/45 bg-wine-700/20 p-3.5 text-xs text-rose-200 mb-4 flex items-start gap-2.5 backdrop-blur-xl"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-300 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-500/40 bg-emerald-900/25 p-3.5 text-xs text-emerald-200 mb-4 flex items-start gap-2.5 backdrop-blur-xl"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <p className="leading-relaxed">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-semibold text-offwhite-200 mb-1.5"
              >
                Registered Student Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-400" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
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
                  <span>Sending reset link...</span>
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4 text-champagne-200" />
                  <span>Send Password Reset Link</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-5 border-t border-offwhite-100/[0.1] pt-4 text-center text-xs text-offwhite-300/80">
            Remembered your password?{' '}
            <Link
              href="/student/login"
              className="font-semibold text-champagne-300 hover:text-champagne-200 underline underline-offset-2"
            >
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>

      <p className="relative text-center text-xs text-offwhite-300/70">
        Professional Studies Department • Dispur College
      </p>
    </div>
  );
}

