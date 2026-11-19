-- ============================================================================
-- Migration: 202611190005_performance_indexes.sql
-- Description: Composite performance indexes for high-throughput queries
-- Author: Senior Database Architect & Performance Engineer
-- Zero-Regression: Safe, non-blocking IF NOT EXISTS index additions
-- ============================================================================

-- 1. Accelerate active loan lookups and inventory calculations
CREATE INDEX IF NOT EXISTS idx_book_issues_active_calc
  ON public.book_issues (book_id, status)
  WHERE return_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_book_rentals_active_calc
  ON public.book_rentals (book_id, status)
  WHERE return_date IS NULL;

-- 2. Accelerate student dashboard queries by student and status
CREATE INDEX IF NOT EXISTS idx_book_issues_student_status
  ON public.book_issues (student_id, status);

CREATE INDEX IF NOT EXISTS idx_book_rentals_student_status
  ON public.book_rentals (student_id, status);

-- 3. Accelerate fine audit record lookups
CREATE INDEX IF NOT EXISTS idx_fine_records_issue_audit
  ON public.fine_records (issue_id, status);

-- 4. Accelerate reminder deduplication lookups
CREATE INDEX IF NOT EXISTS idx_reminders_dedup_lookup
  ON public.book_return_reminders (issue_id, reminder_type, due_date);
