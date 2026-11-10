import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getPublicEnv } from '@/lib/env';
import { getAdminTeam } from '@/lib/queries/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createAdminSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const admins = await getAdminTeam();
  return NextResponse.json({ admins, currentAdminId: auth.admin.id });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(['super_admin']);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = createAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Validation failed.' },
      { status: 400 }
    );
  }

  const { name, email, role, mode, password } = parsed.data;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });
  }

  // Check if admin record already exists
  const { data: existingAdmin } = await adminClient
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingAdmin) {
    return NextResponse.json(
      { error: 'An administrator with this email already exists.' },
      { status: 409 }
    );
  }

  let createdUserId: string | undefined;

  if (mode === 'invite') {
    const { siteUrl } = getPublicEnv();
    const resolvedOrigin =
      siteUrl && !siteUrl.includes('localhost')
        ? siteUrl.replace(/\/+$/, '')
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : new URL(request.url).origin;

    const { data: invited, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: name, role },
        redirectTo: `${resolvedOrigin}/admin/update-password`,
      });

    if (inviteError || !invited.user) {
      return NextResponse.json(
        { error: inviteError?.message || 'Failed to send invitation email.' },
        { status: 400 }
      );
    }
    createdUserId = invited.user.id;
  } else {
    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, role },
      });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create administrator auth account.' },
        { status: 400 }
      );
    }
    createdUserId = created.user.id;
  }

  const { data: insertedAdmin, error: insertError } = await adminClient
    .from('admin_users')
    .insert({
      id: createdUserId,
      name,
      email,
      role,
      is_active: true,
      invited_by: auth.admin.id,
    })
    .select('*')
    .single();

  if (insertError || !insertedAdmin) {
    // Roll back auth user if DB insert fails
    await adminClient.auth.admin.deleteUser(createdUserId);
    return NextResponse.json(
      { error: insertError?.message || 'Failed to save administrator record.' },
      { status: 400 }
    );
  }

  await recordAuditLog({
    actorId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: 'admin.created',
    targetType: 'admin_user',
    targetId: insertedAdmin.id,
    details: { email, role, mode },
  });

  return NextResponse.json({ admin: insertedAdmin }, { status: 201 });
}

