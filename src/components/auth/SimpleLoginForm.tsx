'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface SimpleLoginFormProps {
  initialRole?: 'student' | 'admin';
  redirectTo?: string;
}

export function SimpleLoginForm({
  initialRole = 'student',
  redirectTo,
}: SimpleLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const [role, setRole] = useState<'student' | 'admin'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();

      // Sign in with Supabase Auth
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (signInError || !authData.user) {
        setErrorMessage(
          signInError?.message || 'Invalid email or password. Please try again.'
        );
        setLoading(false);
        return;
      }

      // Verify user profile and role from public.users or role API
      const roleRes = await fetch('/api/auth/role', { cache: 'no-store' });
      const roleInfo = await roleRes.json().catch(() => null);

      const actualRole: 'admin' | 'student' =
        roleInfo?.role === 'admin' ? 'admin' : 'student';

      if (roleInfo && roleInfo.isActive === false) {
        await supabase.auth.signOut();
        setErrorMessage(
          'Your account is currently inactive. Please contact the library administrator.'
        );
        setLoading(false);
        return;
      }

      // Check access permission
      if (role === 'admin' && actualRole !== 'admin') {
        await supabase.auth.signOut();
        setErrorMessage(
          'Access denied. This account does not have administrator privileges.'
        );
        setLoading(false);
        return;
      }

      // Redirect to appropriate portal
      let destination: string;
      if (redirectTo) {
        destination = redirectTo;
      } else if (nextParam && nextParam.startsWith('/')) {
        destination = nextParam;
      } else if (actualRole === 'admin') {
        destination = '/admin';
      } else {
        destination = '/student/dashboard';
      }

      router.push(destination);
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Role Selection Tabs */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-offwhite-100/15 bg-charcoal-900/60 p-1.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => {
            setRole('student');
            setErrorMessage(null);
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 ${
            role === 'student'
              ? 'bg-gradient-to-r from-maroon-700 to-burgundy-700 text-offwhite-50 shadow-md border border-champagne-300/30'
              : 'text-offwhite-300 hover:text-white hover:bg-offwhite-100/[0.06]'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Student Login
        </button>
        <button
          type="button"
          onClick={() => {
            setRole('admin');
            setErrorMessage(null);
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 ${
            role === 'admin'
              ? 'bg-gradient-to-r from-maroon-700 to-burgundy-700 text-offwhite-50 shadow-md border border-champagne-300/30'
              : 'text-offwhite-300 hover:text-white hover:bg-offwhite-100/[0.06]'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Admin Login
        </button>
      </div>

      {/* Login Card */}
      <div className="liquid-glass rounded-3xl p-6 sm:p-8 border border-offwhite-100/15 shadow-2xl backdrop-blur-2xl">
        <div className="mb-6 text-center">
          <h2 className="font-serif text-2xl font-bold text-offwhite-50">
            {role === 'admin' ? 'Administrator Access' : 'Student Access'}
          </h2>
          <p className="mt-1 text-xs text-offwhite-300">
            {role === 'admin'
              ? 'Sign in with your authorized library administrator credentials'
              : 'Sign in with your registered student email and password'}
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-xs text-rose-200 backdrop-blur-xl"
          >
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="auth-email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-offwhite-200"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-300" />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === 'admin'
                    ? 'admin@dispurcollege.ac.in'
                    : 'student@dispurcollege.ac.in'
                }
                className="glass-input pl-10 w-full"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold uppercase tracking-wider text-offwhite-200"
              >
                Password
              </label>
              {role === 'student' && (
                <Link
                  href="/student/forgot-password"
                  className="text-xs text-champagne-300 hover:text-champagne-200 transition-colors"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-300" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="glass-input pl-10 pr-10 w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-offwhite-300 hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="glass-btn-accent w-full py-3 text-sm font-semibold justify-center mt-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              `Sign In as ${role === 'admin' ? 'Administrator' : 'Student'}`
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 pt-5 border-t border-offwhite-100/10 text-center text-xs text-offwhite-300">
          {role === 'student' ? (
            <p>
              New student?{' '}
              <Link
                href="/student/register"
                className="font-semibold text-champagne-300 hover:text-champagne-200 hover:underline"
              >
                Register for an account
              </Link>
            </p>
          ) : (
            <p>
              Need admin access?{' '}
              <span className="text-offwhite-400">
                Contact the departmental super administrator.
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
