import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/admin';
import { getAdminOverviewData } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const data = await getAdminOverviewData();
  return NextResponse.json(data);
}

