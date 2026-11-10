import type { RealtimeClientOptions } from '@supabase/supabase-js';
import Ws from 'ws';

export function getServerRealtimeOptions(): RealtimeClientOptions {
  if (typeof globalThis.WebSocket !== 'undefined') {
    return {};
  }
  return {
    transport: Ws as unknown as RealtimeClientOptions['transport'],
  };
}

