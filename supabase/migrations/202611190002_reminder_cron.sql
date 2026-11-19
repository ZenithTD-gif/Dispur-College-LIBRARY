-- ============================================================================
-- Dispur College - Department of Professional Studies Digital Library
-- Additive Migration: Supabase pg_cron & pg_net Automated Reminder Scheduling
-- ============================================================================

-- 1. Enable pg_net for HTTP dispatch from database triggers/cron
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Create a secure vault or config helper for cron settings if not present
CREATE TABLE IF NOT EXISTS public.reminder_cron_config (
  id integer PRIMARY KEY DEFAULT 1,
  edge_function_url text NOT NULL DEFAULT 'https://your-project-ref.supabase.co/functions/v1/send-book-reminders',
  cron_secret text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  last_executed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure default single row
INSERT INTO public.reminder_cron_config (id, edge_function_url, is_active)
VALUES (1, 'https://your-project-ref.supabase.co/functions/v1/send-book-reminders', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.reminder_cron_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage reminder cron config" ON public.reminder_cron_config;
CREATE POLICY "Admins can manage reminder cron config"
  ON public.reminder_cron_config FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- 3. Stored function to invoke the reminder edge function via pg_net
CREATE OR REPLACE FUNCTION public.invoke_book_return_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_config record;
  v_request_id bigint;
  v_headers jsonb;
BEGIN
  SELECT * INTO v_config FROM public.reminder_cron_config WHERE id = 1;

  IF NOT FOUND OR NOT v_config.is_active THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'Cron inactive or unconfigured');
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || COALESCE(NULLIF(v_config.cron_secret, ''), current_setting('app.settings.service_role_key', true), '')
  );

  -- Perform asynchronous HTTP POST via pg_net
  SELECT net.http_post(
    url := v_config.edge_function_url,
    headers := v_headers,
    body := jsonb_build_object('trigger', 'pg_cron', 'executed_at', now())
  ) INTO v_request_id;

  UPDATE public.reminder_cron_config
  SET last_executed_at = now(), updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object(
    'status', 'dispatched',
    'request_id', v_request_id,
    'timestamp', now()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- 4. Schedule daily check at 09:00 AM IST (03:30 AM UTC) using pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule existing job if previously registered
    PERFORM cron.unschedule('dispur_library_daily_book_reminders')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispur_library_daily_book_reminders');

    -- Schedule job: Run every morning at 03:30 UTC (09:00 AM IST)
    PERFORM cron.schedule(
      'dispur_library_daily_book_reminders',
      '30 3 * * *',
      'SELECT public.invoke_book_return_reminders();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not enabled or accessible in this environment. Dual-path API fallback active.';
END;
$$;
