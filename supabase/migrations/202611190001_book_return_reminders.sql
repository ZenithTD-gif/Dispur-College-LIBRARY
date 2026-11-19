-- ============================================================================
-- Dispur College - Department of Professional Studies Digital Library
-- Additive Migration: Automatic Book Return Reminders & Notification Logs
-- ============================================================================

-- 1. Create table for tracking book return reminders
CREATE TABLE IF NOT EXISTS public.book_return_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.book_issues(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  due_date timestamptz NOT NULL,
  reminder_type text NOT NULL DEFAULT 'due_soon_24h' CHECK (reminder_type IN ('due_soon_24h', 'overdue_alert')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  recipient_email text NOT NULL CHECK (recipient_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  student_name text NOT NULL,
  book_title text NOT NULL,
  email_id text,
  sent_at timestamptz,
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotency constraint: 1 reminder per issue record per due date per reminder type
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_unique_issue_due
  ON public.book_return_reminders (issue_id, due_date, reminder_type);

CREATE INDEX IF NOT EXISTS idx_reminders_issue_id
  ON public.book_return_reminders (issue_id);

CREATE INDEX IF NOT EXISTS idx_reminders_student_id
  ON public.book_return_reminders (student_id);

CREATE INDEX IF NOT EXISTS idx_reminders_status
  ON public.book_return_reminders (status);

CREATE INDEX IF NOT EXISTS idx_reminders_due_date
  ON public.book_return_reminders (due_date);

CREATE INDEX IF NOT EXISTS idx_reminders_created_at_desc
  ON public.book_return_reminders (created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_book_return_reminders_updated_at ON public.book_return_reminders;
CREATE TRIGGER trg_book_return_reminders_updated_at
  BEFORE UPDATE ON public.book_return_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.book_return_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Students can view their own reminders" ON public.book_return_reminders;
CREATE POLICY "Students can view their own reminders"
  ON public.book_return_reminders FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view and manage all reminders" ON public.book_return_reminders;
CREATE POLICY "Admins can view and manage all reminders"
  ON public.book_return_reminders FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());
