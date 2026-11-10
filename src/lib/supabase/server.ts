import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getPublicEnv, isSupabaseConfigured } from '@/lib/env';
import { getServerRealtimeOptions } from '@/lib/supabase/realtime';

export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    realtime: getServerRealtimeOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Safe no-op when invoked from a Server Component where setting cookies is disallowed
        }
      },
    },
  });
}

/**
 * Anonymous public client for public catalog queries that do not depend on cookies.
 */
export function getSupabasePublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  return createClient(supabaseUrl, supabasePublishableKey, {
    realtime: getServerRealtimeOptions(),
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
