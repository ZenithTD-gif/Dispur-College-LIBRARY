import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPublicEnv, isSupabaseConfigured } from '@/lib/env';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { authenticated: false, role: null },
      { status: 401 }
    );
  }

  // 1. Check users table
  const { data: userProfile } = await supabase
    .from('users')
    .select('role, full_name, is_active')
    .eq('id', user.id)
    .single();

  if (userProfile) {
    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: user.email,
      role: userProfile.role,
      name: userProfile.full_name,
      isActive: userProfile.is_active,
    });
  }

  // 2. Fallback check admin_users
  const { data: adminProfile } = await supabase
    .from('admin_users')
    .select('role, name, is_active')
    .eq('id', user.id)
    .single();

  if (adminProfile) {
    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: user.email,
      role: 'admin',
      name: adminProfile.name,
      isActive: adminProfile.is_active,
    });
  }

  // 3. Fallback check students
  const { data: studentProfile } = await supabase
    .from('students')
    .select('full_name, is_active')
    .eq('id', user.id)
    .single();

  if (studentProfile) {
    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: user.email,
      role: 'student',
      name: studentProfile.full_name,
      isActive: studentProfile.is_active,
    });
  }

  return NextResponse.json({
    authenticated: true,
    userId: user.id,
    email: user.email,
    role: 'student',
    isActive: true,
  });
}
