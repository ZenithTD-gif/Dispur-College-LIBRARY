import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadDotEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
      val = val
        .replace(/\/+(rest|auth|storage|realtime)\/v\d+\/?.*$/i, '')
        .replace(/\/+$/, '');
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

