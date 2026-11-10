#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import Ws from 'ws';
import { loadDotEnvLocal } from './lib/env-loader.mjs';

const { Client } = pg;

async function ensureStorageBuckets(supabaseUrl, secretKey) {
  if (!supabaseUrl || !secretKey) return;
  const supabase = createClient(supabaseUrl, secretKey, {
    realtime: typeof WebSocket === 'undefined' ? { transport: Ws } : undefined,
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: buckets } = await supabase.storage.listBuckets();
  const existing = new Set((buckets || []).map((b) => b.name));

  if (!existing.has('book-covers')) {
    const { error } = await supabase.storage.createBucket('book-covers', {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (error) console.warn('Bucket book-covers notice:', error.message);
    else console.log('Created public storage bucket: book-covers');
  }

  if (!existing.has('book-files')) {
    const { error } = await supabase.storage.createBucket('book-files', {
      public: false,
      fileSizeLimit: 104857600,
      allowedMimeTypes: ['application/pdf', 'application/epub+zip'],
    });
    if (error) console.warn('Bucket book-files notice:', error.message);
    else console.log('Created private storage bucket: book-files');
  }
}

async function main() {
  loadDotEnvLocal();

  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!databaseUrl || databaseUrl.includes('your-project-ref')) {
    console.error('Error: Missing valid DATABASE_URL in .env.local');
    process.exit(1);
  }

  const migrationPath = resolve(
    process.cwd(),
    'supabase/migrations/202611100001_initial_schema.sql'
  );
  const fullSql = readFileSync(migrationPath, 'utf8');

  // Split public schema migration vs storage.objects policies in case postgres lacks ownership on storage.objects
  const storagePolicyMarker = '-- 17. Storage Object RLS Policies';
  const markerIdx = fullSql.indexOf(storagePolicyMarker);
  const coreSql = markerIdx > -1 ? fullSql.slice(0, markerIdx) : fullSql;
  const storageSql = markerIdx > -1 ? fullSql.slice(markerIdx) : '';

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    console.log('Applying core PostgreSQL schema, indexes, RLS policies, and buckets...');
    await client.query(coreSql);
    console.log('Core schema migration applied cleanly.');

    if (storageSql) {
      try {
        await client.query(storageSql);
        console.log('Storage object RLS policies applied cleanly.');
      } catch (err) {
        if (err && err.code === '42501') {
          console.warn(
            'Notice: storage.objects policies require Supabase SQL Editor (Dashboard owner role).'
          );
          console.warn(
            'Run lines 326-374 of supabase/migrations/202611100001_initial_schema.sql in Supabase SQL Editor if direct client uploads need RLS.'
          );
        } else {
          throw err;
        }
      }
    }
  } finally {
    await client.end();
  }

  await ensureStorageBuckets(supabaseUrl, secretKey);
}

main().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});

