import { TeamManager } from '@/components/admin/TeamManager';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getAdminTeam } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export default async function AdminTeamPage() {
  const [auth, admins] = await Promise.all([getCurrentAdmin(), getAdminTeam()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-navy-900 sm:text-3xl">
          Authorized Administrators
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage department administrators, role permissions, and account access.
        </p>
      </div>

      <TeamManager
        initialAdmins={admins}
        currentAdminId={auth?.admin.id || ''}
        currentRole={auth?.admin.role || 'editor'}
      />
    </div>
  );
}

