import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { DispurCollegeLogo } from '@/components/shared/DispurCollegeLogo';
import { SimpleLoginForm } from '@/components/auth/SimpleLoginForm';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign In | Dispur College Digital Library',
  description:
    'Sign in to access your student dashboard or administrative library portal.',
};

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md mx-auto liquid-glass rounded-3xl p-8 border border-offwhite-100/15 text-center flex flex-col items-center justify-center min-h-[360px]">
      <Loader2 className="h-6 w-6 animate-spin text-champagne-300 mb-3" />
      <p className="text-xs text-offwhite-300">Loading sign-in portal...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen bg-charcoal-950 text-offwhite-100 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 selection:bg-maroon-700 selection:text-white">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-maroon-800/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-80 w-80 rounded-full bg-burgundy-700/15 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-champagne-400/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-md">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 text-xs text-offwhite-300 hover:text-champagne-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Digital Library
          </Link>
        </div>

        {/* Header Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/library" className="group mb-3">
            <DispurCollegeLogo size="lg" />
          </Link>
          <h1 className="font-serif text-xl font-bold tracking-tight text-offwhite-50">
            Dispur College Digital Library
          </h1>
          <p className="text-xs uppercase tracking-widest text-champagne-300/80 mt-1">
            Department of Professional Studies
          </p>
        </div>

        {/* Simple Login Form wrapped in Suspense boundary */}
        <Suspense fallback={<LoginFormFallback />}>
          <SimpleLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
