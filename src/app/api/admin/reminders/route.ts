import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  getReminderLogs,
  processDueSoonReminders,
} from '@/lib/services/reminder-service';

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
  const limitParam = parseInt(searchParams.get('limit') || '50', 10);
  const limit = isNaN(limitParam) ? 50 : Math.min(Math.max(limitParam, 1), 200);

  try {
    const logs = await getReminderLogs(adminClient, limit);

    // Compute basic statistics
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let pendingCount = 0;

    for (const log of logs) {
      if (log.status === 'sent') sentCount++;
      else if (log.status === 'failed') failedCount++;
      else if (log.status === 'skipped') skippedCount++;
      else if (log.status === 'pending') pendingCount++;
    }

    return NextResponse.json({
      logs,
      stats: {
        total: logs.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
        pending: pendingCount,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API/admin/reminders] Error fetching logs:', message);
    return NextResponse.json(
      { error: 'Failed to retrieve reminder logs.', details: message },
      { status: 500 }
    );
  }
}

export async function POST() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database client unavailable.' }, { status: 503 });
  }

  try {
    const summary = await processDueSoonReminders(adminClient);

    await recordAuditLog({
      actorId: auth.admin.id,
      actorEmail: auth.admin.email,
      action: 'run_book_return_reminders_manual',
      targetType: 'book_return_reminders',
      details: {
        sentCount: summary.sentCount,
        skippedCount: summary.skippedCount,
        failedCount: summary.failedCount,
        totalEligible: summary.totalEligibleFound,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Manual reminder check completed. Sent: ${summary.sentCount}, Skipped: ${summary.skippedCount}, Failed: ${summary.failedCount}`,
      summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API/admin/reminders] Error executing manual check:', message);
    return NextResponse.json(
      { error: 'Failed to execute manual reminder check.', details: message },
      { status: 500 }
    );
  }
}
