import { NextResponse } from 'next/server';
import { isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Student } from '@/types/library';

export interface AuthenticatedStudent {
  student: Student;
}

export async function getCurrentStudent(): Promise<AuthenticatedStudent | null> {
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
  const { data: studentRecord, error: studentError } = await reader
    .from('students')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle<Student>();

  if (studentError || !studentRecord) {
    return null;
  }

  return { student: studentRecord };
}

export async function requireStudentApi(): Promise<
  | { ok: true; student: Student }
  | { ok: false; response: NextResponse }
> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Backend is not configured yet.' },
        { status: 503 }
      ),
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication service unavailable.' },
        { status: 503 }
      ),
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
        { error: 'Authentication required. Please log in as a student.' },
        { status: 401 }
      ),
    };
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Database service unavailable.' },
        { status: 503 }
      ),
    };
  }

  const { data: studentRecord, error: studentError } = await adminClient
    .from('students')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Student>();

  if (studentError || !studentRecord || !studentRecord.is_active) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: Your account is not an active student account.' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, student: studentRecord };
}

