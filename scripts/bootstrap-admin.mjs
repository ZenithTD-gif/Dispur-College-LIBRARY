#!/usr/bin/env node

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createClient } from '@supabase/supabase-js';
import Ws from 'ws';
import { loadDotEnvLocal } from './lib/env-loader.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--') && i + 1 < argv.length) {
      args[token.slice(2)] = argv[++i];
    }
  }
  return args;
}

async function main() {
  loadDotEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !secretKey || supabaseUrl.includes('your-project-ref')) {
    console.error(
      'Error: Missing or placeholder NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY in .env.local.'
    );
    process.exit(1);
  }

  const cliArgs = parseArgs(process.argv.slice(2));
  const rl = readline.createInterface({ input, output });

  try {
    const name = (cliArgs.name || (await rl.question('Primary Admin Full Name: '))).trim();
    const email = (cliArgs.email || (await rl.question('Primary Admin Email: ')))
      .trim()
      .toLowerCase();
    const password =
      cliArgs.password || (await rl.question('Primary Admin Password (min 8 chars): '));

    if (name.length < 2) {
      throw new Error('Name must be at least 2 characters.');
    }
    if (!email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const supabase = createClient(supabaseUrl, secretKey, {
      realtime: typeof WebSocket === 'undefined' ? { transport: Ws } : undefined,
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    let userId = created?.user?.id;

    if (authError) {
      // If user already exists in auth.users, look them up and promote/sync
      if (authError.message.toLowerCase().includes('already')) {
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) throw listErr;
        const existing = listData.users.find((u) => u.email?.toLowerCase() === email);
        if (!existing) throw authError;
        userId = existing.id;
        console.log(`Found existing auth user (${userId}); syncing super_admin profile...`);
      } else {
        throw authError;
      }
    }

    const { error: upsertError } = await supabase.from('admin_users').upsert(
      {
        id: userId,
        name,
        email,
        role: 'super_admin',
        is_active: true,
      },
      { onConflict: 'id' }
    );

    if (upsertError) {
      throw upsertError;
    }

    console.log('\nPrimary Administrator ready!');
    console.log(`  ID:    ${userId}`);
    console.log(`  Name:  ${name}`);
    console.log(`  Email: ${email}`);
    console.log('  Role:  super_admin');
    console.log('\nYou can now sign in at /admin/login.');
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('Failed to bootstrap super_admin:', err.message || err);
  process.exit(1);
});

