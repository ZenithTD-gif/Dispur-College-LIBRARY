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
    <div className="flex min-h-screen flex-col justify-between bg-navy-950 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ivory-200/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Student Library
        </Link>
      </div>

      <div className="mx-auto w-full max-w-md space-y-6 my-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500 text-white shadow-lg">
            <BookMarked className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-300">
            Dispur College, Assam
          </p>
          <h1 className="font-serif text-2xl font-bold text-white">
            Department Digital Library
          </h1>
          <p className="text-xs text-ivory-200/75">
            Professional Studies Department — Authorized Administrator Sign-In
          </p>
        </div>

        {!configured && <SetupNotice context="admin" />}

        <div className="rounded-2xl border border-parchment-300 bg-ivory-50 p-6 shadow-2xl sm:p-8">
          <div className="mb-5 flex items-center gap-2 border-b border-parchment-200 pb-3">
            <ShieldCheck className="h-4 w-4 text-gold-600" />
            <h2 className="text-sm font-bold text-navy-900">
              Administrator Authentication
            </h2>
          </div>

          <Suspense fallback={<div className="py-6 text-center text-xs text-slate-500">Loading sign-in form...</div>}>
            <AdminLoginForm configured={configured} />
          </Suspense>

          <p className="mt-5 border-t border-parchment-200 pt-4 text-center text-[11px] leading-relaxed text-slate-500">
            Public registration is disabled. Contact the Primary Department
            Administrator to request authorized access.
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-ivory-200/50">
        Professional Studies Department • Dispur College
      </p>
    </div>
  );
}

