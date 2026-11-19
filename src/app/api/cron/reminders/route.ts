import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processDueSoonReminders } from '@/lib/services/reminder-service';
import { requireAdminApi } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

async function handleReminderScan(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim() || '';

  const expectedSecret = process.env.CRON_SECRET?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  let isAuthorized = false;

  if (expectedSecret && (token === expectedSecret || headerSecret === expectedSecret)) {
    isAuthorized = true;
  } else if (serviceRoleKey && token === serviceRoleKey) {
    isAuthorized = true;
  } else {
    // Check if an admin is logged in
    const adminCheck = await requireAdminApi();
    if (adminCheck.ok) {
      isAuthorized = true;
    }
  }

  // If CRON_SECRET is not configured in local environment, allow execution with audit warning
  if (!expectedSecret && !serviceRoleKey) {
    console.warn('[cron/reminders] CRON_SECRET not configured. Allowing trigger in dev mode.');
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing authorization credentials.' },
      { status: 401 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: 'Supabase admin client unavailable.' },
      { status: 503 }
    );
  }

  try {
    const summary = await processDueSoonReminders(adminClient);
    return NextResponse.json({
      success: true,
      message: `Scanned active loans. Sent: ${summary.sentCount}, Skipped: ${summary.skippedCount}, Failed: ${summary.failedCount}`,
      summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API/cron/reminders] Error running reminder scanner:', message);
    return NextResponse.json(
      { error: 'Internal server error during reminder processing', details: message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleReminderScan(request);
}

export async function POST(request: NextRequest) {
  return handleReminderScan(request);
}
