import { afterEach, describe, expect, it } from 'vitest';
import { getPublicEnv, getServerSecrets, isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/env';

describe('environment configuration checks', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('treats placeholder environment variables as unconfigured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-ref.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_your_publishable_key_here';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_your_secret_key_here';

    expect(isSupabaseConfigured()).toBe(false);
    expect(isSupabaseAdminConfigured()).toBe(false);
  });

  it('accepts valid publishable/secret keys as well as legacy anon/service_role keys', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dispurcollege.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_real_abc123';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_real_xyz789';

    expect(isSupabaseConfigured()).toBe(true);
    expect(isSupabaseAdminConfigured()).toBe(true);
    expect(getPublicEnv().supabasePublishableKey).toBe('sb_publishable_real_abc123');
    expect(getServerSecrets().supabaseSecretKey).toBe('sb_secret_real_xyz789');

    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJ_legacy_anon_key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJ_legacy_service_role_key';

    expect(isSupabaseConfigured()).toBe(true);
    expect(isSupabaseAdminConfigured()).toBe(true);
  });

  it('normalizes Supabase URLs accidentally containing /rest/v1/ or trailing slashes', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example-proj.supabase.co/rest/v1/';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_real_abc123';

    expect(getPublicEnv().supabaseUrl).toBe('https://example-proj.supabase.co');
    expect(isSupabaseConfigured()).toBe(true);
  });
});

