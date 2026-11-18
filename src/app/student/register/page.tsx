import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, GraduationCap, ShieldCheck } from 'lucide-react';
import { DispurCollegeLogo } from '@/components/shared/DispurCollegeLogo';
import { SetupNotice } from '@/components/shared/SetupNotice';
import { StudentRegisterForm } from '@/components/student/StudentRegisterForm';
import { getCurrentStudent } from '@/lib/auth/student';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function StudentRegisterPage() {
  const configured = isSupabaseConfigured();

  if (configured) {
    const studentAuth = await getCurrentStudent();
    if (studentAuth) {
      redirect('/student/dashboard');
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden px-4 py-8 sm:px-6">
      {/* Ambient Depth Orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 animate-float-slow rounded-full bg-maroon-700/35 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-burgundy-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-12 h-80 w-80 rounded-full bg-champagne-400/10 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-xl items-center justify-between">
        <Link href="/student/login" className="glass-btn group px-3.5 py-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Back to Student Login</span>
        </Link>
        <Link href="/admin/login" className="glass-btn px-3 py-1.5 text-xs text-offwhite-300">
          <ShieldCheck className="h-3.5 w-3.5 text-champagne-300" />
          <span>Admin Portal</span>
        </Link>
      </div>

      <div className="animate-page-enter relative mx-auto w-full max-w-xl space-y-5 my-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <DispurCollegeLogo size="lg" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-champagne-300">
            Dispur College, Guwahati, Assam
          </p>
          <h1 className="font-serif text-2xl font-bold text-offwhite-50 sm:text-3xl">
            Student Registration
          </h1>
          <p className="text-xs text-offwhite-300 max-w-md mx-auto">
            Professional Studies Department — Register to access your borrowing records,
            track issued books, 7-day free borrowing periods, and late return fines.
          </p>
        </div>

        {!configured && <SetupNotice context="library" />}

        <div className="liquid-glass p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between border-b border-offwhite-100/[0.1] pb-3.5">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-champagne-300" />
              <h2 className="text-sm font-bold text-offwhite-50">
                Create Student Account
              </h2>
            </div>
            <span className="glass-pill text-[10px] text-champagne-200">
              Department Students
            </span>
          </div>

          <Suspense
            fallback={
              <div className="py-6 text-center text-xs text-offwhite-300/75">
                Loading registration form...
              </div>
            }
          >
            <StudentRegisterForm configured={configured} />
          </Suspense>
        </div>
      </div>

      <p className="relative text-center text-xs text-offwhite-300/70 pb-4">
        Professional Studies Department • Dispur College, Guwahati, Assam
      </p>
    </div>
  );
}
