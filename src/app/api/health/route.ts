import { NextResponse } from 'next/server';
import { isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Dispur College - Professional Studies Department Digital Library',
    supabaseConfigured: isSupabaseConfigured(),
    supabaseAdminConfigured: isSupabaseAdminConfigured(),
    timestamp: new Date().toISOString(),
  });
}

