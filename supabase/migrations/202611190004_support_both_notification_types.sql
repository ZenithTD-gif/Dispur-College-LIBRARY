-- ============================================================================
-- Dispur College - Department of Professional Studies Digital Library
-- Additive Migration: Support Both Notification Types (Issue Confirmation & Return Warning)
-- ============================================================================

-- 1. Expand reminder_type constraint to support BOOK_ISSUE_CONFIRMATION & BOOK_RETURN_REMINDER
ALTER TABLE public.book_return_reminders
  DROP CONSTRAINT IF EXISTS book_return_reminders_reminder_type_check;

ALTER TABLE public.book_return_reminders
  ADD CONSTRAINT book_return_reminders_reminder_type_check
  CHECK (reminder_type IN (
    'BOOK_ISSUE_CONFIRMATION',
    'BOOK_RETURN_REMINDER',
    'due_soon_24h',
    'overdue_alert'
  ));

-- 2. Expand status constraint to support accepted / delivered statuses
ALTER TABLE public.book_return_reminders
  DROP CONSTRAINT IF EXISTS book_return_reminders_status_check;

ALTER TABLE public.book_return_reminders
  ADD CONSTRAINT book_return_reminders_status_check
  CHECK (status IN (
    'pending',
    'sent',
    'failed',
    'skipped',
    'accepted'
  ));

-- 3. Ensure composite index for fast lookups by issue_id and reminder_type
CREATE INDEX IF NOT EXISTS idx_reminders_issue_type
  ON public.book_return_reminders (issue_id, reminder_type);
