import { NextRequest, NextResponse } from 'next/server';
import { requireStudentApi } from '@/lib/auth/student';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { studentProfileUpdateSchema } from '@/lib/validation';
import type { Student } from '@/types/library';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireStudentApi();
  if (!auth.ok) {
    return auth.response;
  }
  return NextResponse.json({ student: auth.student });
}

export async function PUT(request: NextRequest) {
  const auth = await requireStudentApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { student } = auth;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database client unavailable.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = studentProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message || 'Invalid profile data.' },
      { status: 400 }
    );
  }

  const updates: Partial<Pick<Student, 'full_name' | 'department' | 'semester' | 'phone'>> = {};
  if (parsed.data.fullName) updates.full_name = parsed.data.fullName.trim();
  if (parsed.data.department) updates.department = parsed.data.department.trim();
  if (parsed.data.semester) updates.semester = parsed.data.semester.trim();
  if (parsed.data.phone) updates.phone = parsed.data.phone.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ student });
  }

  const { data: updatedRecord, error: updateError } = await adminClient
    .from('students')
    .update(updates)
    .eq('id', student.id)
    .select('*')
    .single<Student>();

  if (updateError || !updatedRecord) {
    console.error('Failed to update student profile:', updateError);
    return NextResponse.json(
      { error: 'Failed to update student profile.' },
      { status: 500 }
    );
  }

  // Also update auth user metadata if name changed
  if (updates.full_name) {
    await adminClient.auth.admin.updateUserById(student.id, {
      user_metadata: { full_name: updates.full_name },
    });
  }

  return NextResponse.json({
    ok: true,
    message: 'Profile updated successfully.',
    student: updatedRecord,
  });
}

