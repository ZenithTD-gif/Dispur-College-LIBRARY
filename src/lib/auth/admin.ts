import { NextResponse } from 'next/server';
import { isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { AdminRole, AdminUser } from '@/types/library';

export interface AuthenticatedAdmin {
  admin: AdminUser;
}

export async function getCurrentAdmin(): Promise<AuthenticatedAdmin | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const reader = getSupabaseAdminClient() || supabase;
  const { data: adminRecord, error: adminError } = await reader
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle<AdminUser>();

  if (adminError || !adminRecord) {
    return null;
  }

  return { admin: adminRecord };
}

export async function requireAdminApi(
  allowedRoles?: AdminRole[]
): Promise<
  | { ok: true; admin: AdminUser }
  | { ok: false; response: NextResponse }
> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'Cloud backend is not configured yet. Please set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY.',
        },
        { status: 503 }
      ),
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authentication service unavailable.' }, { status: 503 }),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required. Please sign in as an administrator.' },
        { status: 401 }
      ),
    };
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server storage/admin client unavailable.' }, { status: 503 }),
    };
  }

  const { data: adminRecord, error: adminError } = await adminClient
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<AdminUser>();

  if (adminError || !adminRecord || !adminRecord.is_active) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: Your account is not an active library administrator.' },
        { status: 403 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(adminRecord.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: Insufficient administrator role permissions for this action.' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, admin: adminRecord };
}

export async function recordAuditLog(params: {
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return;

  try {
    await adminClient.from('audit_logs').insert({
      actor_id: params.actorId,
      actor_email: params.actorEmail,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      details: params.details ?? {},
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}

