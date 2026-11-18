import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog } from '@/lib/auth/admin';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { studentRegistrationSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Backend service is not configured yet.' },
      { status: 503 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: 'Database service unavailable.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = studentRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message || 'Invalid registration data.' },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanRegNo = data.registrationNumber.trim();
  const cleanRollNo = data.collegeRollNumber.trim();
  const cleanFullName = data.fullName.trim();
  const cleanDept = data.department.trim();
  const cleanSemester = data.semester.trim();
  const cleanPhone = data.phone.trim();

  // 1. Check for duplicates in students table
  // Check email
  const { data: existingEmail } = await adminClient
    .from('students')
    .select('id')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (existingEmail) {
    return NextResponse.json(
      { error: 'An account with this email address is already registered.' },
      { status: 409 }
    );
  }

  // Check GU registration number
  const { data: existingRegNo } = await adminClient
    .from('students')
    .select('id')
    .ilike('registration_number', cleanRegNo)
    .maybeSingle();

  if (existingRegNo) {
    return NextResponse.json(
      { error: `GU Registration Number "${cleanRegNo}" is already registered to an existing account.` },
      { status: 409 }
    );
  }

  // Check college roll number
  const { data: existingRollNo } = await adminClient
    .from('students')
    .select('id')
    .ilike('college_roll_number', cleanRollNo)
    .maybeSingle();

  if (existingRollNo) {
    return NextResponse.json(
      { error: `College Roll Number "${cleanRollNo}" is already registered to an existing account.` },
      { status: 409 }
    );
  }

  // 2. Create the Auth User in Supabase Auth
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: cleanEmail,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: cleanFullName,
      registration_number: cleanRegNo,
      college_roll_number: cleanRollNo,
      department: cleanDept,
      semester: cleanSemester,
      role: 'student',
    },
  });

  if (authError || !authUser?.user) {
    // Check if error is email already taken in auth
    const message = authError?.message || 'Failed to create student account.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userId = authUser.user.id;

  // 3. Insert student record into public.students
  const { error: insertError } = await adminClient.from('students').insert({
    id: userId,
    full_name: cleanFullName,
    registration_number: cleanRegNo,
    college_roll_number: cleanRollNo,
    department: cleanDept,
    semester: cleanSemester,
    email: cleanEmail,
    phone: cleanPhone,
    is_active: true,
  });

  if (insertError) {
    // Rollback auth user
    await adminClient.auth.admin.deleteUser(userId);
    console.error('Failed to insert student record:', insertError);
    return NextResponse.json(
      { error: 'Database error creating student profile. Please try again.' },
      { status: 500 }
    );
  }

  // 4. Audit Log
  await recordAuditLog({
    actorId: userId,
    actorEmail: cleanEmail,
    action: 'STUDENT_REGISTERED',
    targetType: 'student',
    targetId: userId,
    details: {
      fullName: cleanFullName,
      registrationNumber: cleanRegNo,
      collegeRollNumber: cleanRollNo,
      department: cleanDept,
      semester: cleanSemester,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      message: 'Student account registered successfully! You can now log in.',
      studentId: userId,
    },
    { status: 201 }
  );
}

