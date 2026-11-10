#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import Ws from 'ws';
import { loadDotEnvLocal } from './lib/env-loader.mjs';

async function main() {
  loadDotEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const pubKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !pubKey || !secretKey || supabaseUrl.includes('your-project-ref')) {
    console.error(
      'Missing or placeholder Supabase environment variables in .env.local.'
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    realtime: typeof WebSocket === 'undefined' ? { transport: Ws } : undefined,
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Checking Supabase Database Tables...');
  const tables = ['admin_users', 'categories', 'books', 'storage_assets', 'audit_logs'];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact' })
      .limit(1);
    if (error) {
      console.error(`  [FAIL] Table "${table}": ${error.message}`);
      process.exit(1);
    }
    console.log(`  [OK]   Table "${table}" (${count ?? 0} rows)`);
  }

  console.log('Checking Supabase Cloud Storage Buckets...');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError || !buckets) {
    console.error(`  [FAIL] Unable to list storage buckets: ${bucketError?.message}`);
    process.exit(1);
  }

  for (const expected of [
    { name: 'book-covers', shouldBePublic: true },
    { name: 'book-files', shouldBePublic: false },
  ]) {
    const found = buckets.find((b) => b.name === expected.name);
    if (!found) {
      console.error(`  [FAIL] Missing storage bucket "${expected.name}". Run the SQL migration.`);
      process.exit(1);
    }
    const visLabel = found.public ? 'public' : 'private';
    console.log(`  [OK]   Bucket "${expected.name}" (${visLabel})`);
  }

  const { count: adminCount } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (!adminCount) {
    console.log('\n[NEXT STEP] Database is clean and empty. Run "npm run bootstrap-admin" to create your first Primary Administrator.');
  } else {
    console.log(`\n[READY] Found ${adminCount} active administrator account(s).`);
  }
}

main().catch((err) => {
  console.error('Verification failed:', err.message || err);
  process.exit(1);
});

