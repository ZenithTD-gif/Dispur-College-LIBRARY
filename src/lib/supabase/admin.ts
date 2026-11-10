import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv, getServerSecrets, isSupabaseAdminConfigured } from '@/lib/env';
import { getServerRealtimeOptions } from '@/lib/supabase/realtime';

/**
 * Privileged server-only Supabase client (bypasses RLS).
 * NEVER import this module into Client Components.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    throw new Error('Security violation: getSupabaseAdminClient cannot be called in the browser.');
  }

  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { supabaseUrl } = getPublicEnv();
  const { supabaseSecretKey } = getServerSecrets();

  return createClient(supabaseUrl, supabaseSecretKey, {
    realtime: getServerRealtimeOptions(),
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

