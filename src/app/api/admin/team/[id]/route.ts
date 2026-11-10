import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidUuid, updateAdminSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(['super_admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid administrator ID.' }, { status: 400 });
  }

  if (id === auth.admin.id) {
    return NextResponse.json(
      { error: 'You cannot modify your own active super-admin status or role here.' },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = updateAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Validation failed.' },
      { status: 400 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });
  }

  const { data: target } = await adminClient
    .from('admin_users')
    .select('id, role, email')
    .eq('id', id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: 'Administrator not found.' }, { status: 404 });
  }

  if (target.role === 'super_admin') {
    return NextResponse.json(
      { error: 'Primary super_admin accounts cannot be demoted or deactivated via this panel.' },
      { status: 403 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields provided to update.' }, { status: 400 });
  }

  const { data: updated, error } = await adminClient
    .from('admin_users')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update administrator.' },
      { status: 400 }
    );
  }

  await recordAuditLog({
    actorId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: 'admin.updated',
    targetType: 'admin_user',
    targetId: id,
    details: updates,
  });

  return NextResponse.json({ admin: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(['super_admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid administrator ID.' }, { status: 400 });
  }

  if (id === auth.admin.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own administrator account.' },
      { status: 400 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });
  }

  const { data: target } = await adminClient
    .from('admin_users')
    .select('id, role, email')
    .eq('id', id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: 'Administrator not found.' }, { status: 404 });
  }

  if (target.role === 'super_admin') {
    return NextResponse.json(
      { error: 'Primary super_admin accounts cannot be removed.' },
      { status: 403 }
    );
  }

  const { error: deleteErr } = await adminClient.from('admin_users').delete().eq('id', id);
  if (deleteErr) {
    return NextResponse.json(
      { error: deleteErr.message || 'Failed to delete administrator.' },
      { status: 400 }
    );
  }

  // Also remove corresponding Supabase Auth account so credentials stop working immediately
  await adminClient.auth.admin.deleteUser(id);

  await recordAuditLog({
    actorId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: 'admin.deleted',
    targetType: 'admin_user',
    targetId: id,
    details: { email: target.email },
  });

  return NextResponse.json({ ok: true });
}

