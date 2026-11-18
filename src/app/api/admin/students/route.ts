import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { sanitizeSearchTerm } from '@/lib/validation';
import type { Student } from '@/types/library';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database client unavailable.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const department = searchParams.get('department');
  const semester = searchParams.get('semester');

  let query = adminClient
    .from('students')
    .select(`
      *,
      rentals:book_rentals (
        id,
        status,
        fine_amount,
        fine_paid,
        due_date
      )
    `)
    .order('created_at', { ascending: false });

  if (department) {
    query = query.eq('department', department);
  }
  if (semester) {
    query = query.eq('semester', semester);
  }

  const { data: studentsData, error: studentsError } = await query;
  if (studentsError) {
    console.error('Failed to fetch students:', studentsError);
    return NextResponse.json({ error: 'Failed to fetch students.' }, { status: 500 });
  }

  const cleanTerm = q ? sanitizeSearchTerm(q).toLowerCase() : '';

  const enrichedStudents = (studentsData || [])
    .filter((s) => {
      if (!cleanTerm) return true;
      return (
        s.full_name?.toLowerCase().includes(cleanTerm) ||
        s.registration_number?.toLowerCase().includes(cleanTerm) ||
        s.college_roll_number?.toLowerCase().includes(cleanTerm) ||
        s.email?.toLowerCase().includes(cleanTerm) ||
        s.department?.toLowerCase().includes(cleanTerm)
      );
    })
    .map((s) => {
      const rentalsList = (s.rentals as Array<{
        id: string;
        status: string;
        fine_amount: number;
        fine_paid: boolean;
        due_date: string;
      }>) || [];

      const activeLoans = rentalsList.filter((r) => r.status === 'issued').length;
      const totalLoans = rentalsList.length;
      const unpaidFines = rentalsList.reduce((sum, r) => {
        if (!r.fine_paid && Number(r.fine_amount) > 0) {
          return sum + Number(r.fine_amount);
        }
        return sum;
      }, 0);

      const { rentals: omittedRentals, ...studentInfo } = s;
      void omittedRentals;
      return {
        ...studentInfo,
        active_loans: activeLoans,
        total_loans: totalLoans,
        unpaid_fines: unpaidFines,
      };
    });

  return NextResponse.json({
    students: enrichedStudents,
    total: enrichedStudents.length,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { admin } = auth;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database client unavailable.' }, { status: 503 });
  }

  let body: {
    studentId?: string;
    isActive?: boolean;
    department?: string;
    semester?: string;
    phone?: string;
    fullName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (!body.studentId) {
    return NextResponse.json({ error: 'Student ID is required.' }, { status: 400 });
  }

  const updates: Partial<Student> = {};
  if (typeof body.isActive === 'boolean') updates.is_active = body.isActive;
  if (body.department) updates.department = body.department.trim();
  if (body.semester) updates.semester = body.semester.trim();
  if (body.phone) updates.phone = body.phone.trim();
  if (body.fullName) updates.full_name = body.fullName.trim();

  const { data: updatedStudent, error: updateError } = await adminClient
    .from('students')
    .update(updates)
    .eq('id', body.studentId)
    .select('*')
    .single();

  if (updateError || !updatedStudent) {
    console.error('Failed to update student:', updateError);
    return NextResponse.json(
      { error: 'Failed to update student account.' },
      { status: 500 }
    );
  }

  await recordAuditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: 'STUDENT_ACCOUNT_UPDATED',
    targetType: 'student',
    targetId: body.studentId,
    details: updates,
  });

  return NextResponse.json({
    ok: true,
    message: 'Student account updated successfully.',
    student: updatedStudent,
  });
}
