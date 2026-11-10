import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { categorySchema, isValidUuid, slugifyCategory } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid category ID.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Validation failed.' },
      { status: 400 }
    );
  }

  const slug = slugifyCategory(parsed.data.category_name);
  if (!slug) {
    return NextResponse.json(
      { error: 'Category name must contain alphanumeric characters.' },
      { status: 400 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });
  }

  const { data: updated, error } = await adminClient
    .from('categories')
    .update({
      category_name: parsed.data.category_name,
      slug,
      description: parsed.data.description,
      icon_name: parsed.data.icon_name,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !updated) {
    const isDuplicate = error?.code === '23505';
    return NextResponse.json(
      {
        error: isDuplicate
          ? 'Another category already uses that name.'
          : error?.message || 'Failed to update category.',
      },
      { status: isDuplicate ? 409 : 400 }
    );
  }

  await recordAuditLog({
    actorId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: 'category.updated',
    targetType: 'category',
    targetId: id,
    details: { category_name: updated.category_name },
  });

  return NextResponse.json({ category: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid category ID.' }, { status: 400 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });
  }

  const { count } = await adminClient
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete this category because ${count} book(s) are assigned to it. Reassign those books first.`,
      },
      { status: 409 }
    );
  }

  const { data: removed, error } = await adminClient
    .from('categories')
    .delete()
    .eq('id', id)
    .select('id, category_name')
    .single();

  if (error || !removed) {
    return NextResponse.json(
      { error: error?.message || 'Category not found or could not be deleted.' },
      { status: 400 }
    );
  }

  await recordAuditLog({
    actorId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: 'category.deleted',
    targetType: 'category',
    targetId: id,
    details: { category_name: removed.category_name },
  });

  return NextResponse.json({ ok: true });
}

