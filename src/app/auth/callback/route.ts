import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeAuthRedirectPath } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextRaw = searchParams.get('next') || '';
  const defaultFallback = nextRaw.startsWith('/student') ? '/student/dashboard' : '/admin';
  const safeNext = sanitizeAuthRedirectPath(nextRaw, defaultFallback);

  if (code) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
    }
  }

  const fallback = nextRaw.startsWith('/student') ? '/student/login' : '/admin/login';
  return NextResponse.redirect(`${origin}${fallback}`);
}

