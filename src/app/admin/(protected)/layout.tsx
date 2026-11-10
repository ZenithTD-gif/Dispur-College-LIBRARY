import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    redirect('/admin/login');
  }

  const active = await getCurrentAdmin();
  if (!active) {
    const supabase = await getSupabaseServerClient();
    const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (data.user) {
      redirect('/admin/login?error=unauthorized');
    }
    redirect('/admin/login');
  }

  return <AdminShell admin={active.admin}>{children}</AdminShell>;
}

