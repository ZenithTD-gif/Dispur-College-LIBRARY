import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, BookMarked, ShieldCheck } from 'lucide-react';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { SetupNotice } from '@/components/shared/SetupNotice';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const configured = isSupabaseConfigured();

  if (configured) {
    const active = await getCurrentAdmin();
    if (active) {
      redirect('/admin');
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden px-4 py-10 sm:px-6">
      {/* Ambient Deep Blue / Purple / Burgundy Glass Orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-amethyst-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-12 h-80 w-80 rounded-full bg-burgundy-700/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md">
        <Link
          href="/library"
          className="glass-btn group px-3.5 py-1.5 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to Student Library
        </Link>
      </div>

      <div className="relative mx-auto w-full max-w-md space-y-6 my-8">
        <div className="text-center space-y-2.5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-gradient-to-br from-blue-500/35 via-amethyst-500/30 to-burgundy-700/40 text-white shadow-[0_12px_28px_-6px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl">
            <BookMarked className="h-6 w-6 text-amethyst-300" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-300">
            Dispur College, Assam
          </p>
          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">
            Department Digital Library
          </h1>
          <p className="text-xs text-slate-300">
            Professional Studies Department — Authorized Administrator Sign-In
          </p>
        </div>

        {!configured && <SetupNotice context="admin" />}

        <div className="liquid-glass p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-2 border-b border-white/[0.1] pb-3.5">
            <ShieldCheck className="h-4 w-4 text-amethyst-300" />
            <h2 className="text-sm font-bold text-white">
              Administrator Authentication
            </h2>
          </div>

          <Suspense
            fallback={
              <div className="py-6 text-center text-xs text-slate-400">
                Loading sign-in form...
              </div>
            }
          >
            <AdminLoginForm configured={configured} />
          </Suspense>

          <p className="mt-5 border-t border-white/[0.1] pt-4 text-center text-[11px] leading-relaxed text-slate-400">
            Public registration is disabled. Contact the Primary Department
            Administrator to request authorized access.
          </p>
        </div>
      </div>

      <p className="relative text-center text-xs text-slate-400">
        Professional Studies Department • Dispur College
      </p>
    </div>
  );
}

