-- ============================================================================
-- Dispur College - Department of Professional Studies Digital Library
-- Additive Migration: Inventory Availability Synchronization & Database Triggers
-- ============================================================================

-- 1. Function to authoritatively calculate and synchronize available copies for a book
CREATE OR REPLACE FUNCTION public.sync_book_inventory(p_book_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_active integer;
  v_available integer;
BEGIN
  -- 1. Fetch total copies configured for this book
  SELECT COALESCE(total_copies, 1) INTO v_total
  FROM public.books
  WHERE id = p_book_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- 2. Count active, unreturned issues for this book across both issue tables
  SELECT COUNT(DISTINCT loan_id) INTO v_active
  FROM (
    SELECT id AS loan_id FROM public.book_issues
    WHERE book_id = p_book_id
      AND status IN ('issued', 'overdue')
      AND return_date IS NULL
    UNION
    SELECT id AS loan_id FROM public.book_rentals
    WHERE book_id = p_book_id
      AND status IN ('issued', 'overdue')
      AND return_date IS NULL
  ) active_loans;

  -- 3. Calculate Available Copies = GREATEST(0, Total Copies - Currently Active Copies)
  v_available := GREATEST(0, v_total - v_active);

  -- 4. Atomically persist available copies on books table
  UPDATE public.books
  SET available_copies = v_available,
      updated_at = now()
  WHERE id = p_book_id;

  RETURN v_available;
END;
$$;

-- 2. Trigger handler function for book_issues and book_rentals
CREATE OR REPLACE FUNCTION public.trg_sync_book_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Avoid any potential recursive trigger execution
  IF pg_trigger_depth() > 2 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- For DELETE or book_id change, sync the old book
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_book_inventory(OLD.book_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.book_id IS DISTINCT FROM NEW.book_id THEN
    PERFORM public.sync_book_inventory(OLD.book_id);
  END IF;

  -- Sync current/new book
  IF NEW.book_id IS NOT NULL THEN
    PERFORM public.sync_book_inventory(NEW.book_id);
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach triggers to public.book_issues
DROP TRIGGER IF EXISTS trg_book_issues_sync_inventory ON public.book_issues;
CREATE TRIGGER trg_book_issues_sync_inventory
  AFTER INSERT OR UPDATE OF status, return_date, book_id OR DELETE
  ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_book_inventory();

-- 4. Attach triggers to public.book_rentals
DROP TRIGGER IF EXISTS trg_book_rentals_sync_inventory ON public.book_rentals;
CREATE TRIGGER trg_book_rentals_sync_inventory
  AFTER INSERT OR UPDATE OF status, return_date, book_id OR DELETE
  ON public.book_rentals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_book_inventory();

-- 5. Data synchronization: ensure book_issues mirrors any already-returned book_rentals
UPDATE public.book_issues bi
SET status = 'returned',
    return_date = COALESCE(br.return_date, now()),
    fine_amount = COALESCE(br.fine_amount, bi.fine_amount),
    fine_paid = COALESCE(br.fine_paid, bi.fine_paid),
    returned_by = COALESCE(br.returned_by, bi.returned_by),
    updated_at = now()
FROM public.book_rentals br
WHERE bi.id = br.id
  AND br.status = 'returned'
  AND bi.status != 'returned';

-- 6. Recalculate and synchronize inventory availability for ALL books in the catalog
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.books LOOP
    PERFORM public.sync_book_inventory(r.id);
  END LOOP;
END;
$$;
