import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getAdminCategories } from '@/lib/queries/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { categorySchema, slugifyCategory } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const categories = await getAdminCategories();
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

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

  const { data: created, error } = await adminClient
    .from('categories')
    .insert({
      category_name: parsed.data.category_name,
      slug,
      description: parsed.data.description,
      icon_name: parsed.data.icon_name,
    })
    .select('*')
    .single();

  if (error || !created) {
    const isDuplicate = error?.code === '23505';
    return NextResponse.json(
      {
        error: isDuplicate
          ? 'A category with that name already exists.'
          : error?.message || 'Failed to create category.',
      },
      { status: isDuplicate ? 409 : 400 }
    );
  }

  await recordAuditLog({
    actorId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: 'category.created',
    targetType: 'category',
    targetId: created.id,
    details: { category_name: created.category_name },
  });

  return NextResponse.json({ category: { ...created, book_count: 0 } }, { status: 201 });
}

