-- ============================================================================
-- Professional Studies Department - Digital Library (Dispur College, Assam)
-- Student Authentication & Book Rental Management Schema & RLS Policies
-- ============================================================================

-- 1. Students Table
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(trim(full_name)) >= 2),
  registration_number text NOT NULL UNIQUE CHECK (char_length(trim(registration_number)) >= 3),
  college_roll_number text NOT NULL UNIQUE CHECK (char_length(trim(college_roll_number)) >= 1),
  department text NOT NULL CHECK (char_length(trim(department)) >= 2),
  semester text NOT NULL CHECK (char_length(trim(semester)) >= 1),
  email text NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone text NOT NULL CHECK (char_length(trim(phone)) >= 7),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness for registration and roll numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_reg_no_lower ON public.students (lower(trim(registration_number)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_roll_no_lower ON public.students (lower(trim(college_roll_number)));
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students (email);
CREATE INDEX IF NOT EXISTS idx_students_created_at_desc ON public.students (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_full_name_trgm ON public.students USING gin (full_name gin_trgm_ops);

-- Trigger for students updated_at
DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Library Settings Table (Admin-configurable fine rate & borrowing policy)
CREATE TABLE IF NOT EXISTS public.library_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_fine_rate numeric(10, 2) NOT NULL DEFAULT 5.00 CHECK (daily_fine_rate >= 0),
  borrowing_period_days integer NOT NULL DEFAULT 7 CHECK (borrowing_period_days > 0),
  max_books_per_student integer NOT NULL DEFAULT 3 CHECK (max_books_per_student > 0),
  currency_symbol text NOT NULL DEFAULT '₹',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL
);

INSERT INTO public.library_settings (id, daily_fine_rate, borrowing_period_days, max_books_per_student, currency_symbol)
VALUES (1, 5.00, 7, 3, '₹')
ON CONFLICT (id) DO NOTHING;

-- Trigger for library_settings updated_at
DROP TRIGGER IF EXISTS trg_library_settings_updated_at ON public.library_settings;
CREATE TRIGGER trg_library_settings_updated_at
  BEFORE UPDATE ON public.library_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Book Rentals / Borrowing Table
CREATE TABLE IF NOT EXISTS public.book_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  issue_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz NOT NULL,
  return_date timestamptz,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue', 'lost')),
  daily_fine_rate_snapshot numeric(10, 2) NOT NULL DEFAULT 5.00 CHECK (daily_fine_rate_snapshot >= 0),
  fine_amount numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (fine_amount >= 0),
  fine_paid boolean NOT NULL DEFAULT false,
  notes text,
  issued_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  returned_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_rentals_student_id ON public.book_rentals(student_id);
CREATE INDEX IF NOT EXISTS idx_book_rentals_book_id ON public.book_rentals(book_id);
CREATE INDEX IF NOT EXISTS idx_book_rentals_status ON public.book_rentals(status);
CREATE INDEX IF NOT EXISTS idx_book_rentals_due_date ON public.book_rentals(due_date);
CREATE INDEX IF NOT EXISTS idx_book_rentals_created_at_desc ON public.book_rentals(created_at DESC);

-- Trigger for book_rentals updated_at
DROP TRIGGER IF EXISTS trg_book_rentals_updated_at ON public.book_rentals;
CREATE TRIGGER trg_book_rentals_updated_at
  BEFORE UPDATE ON public.book_rentals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Security Helper Functions
CREATE OR REPLACE FUNCTION public.is_active_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_student() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_student() TO authenticated, service_role;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_rentals ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: students
DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
CREATE POLICY "Students can view their own profile"
  ON public.students FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Students can update their own profile" ON public.students;
CREATE POLICY "Students can update their own profile"
  ON public.students FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
CREATE POLICY "Admins can view all students"
  ON public.students FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
CREATE POLICY "Admins can insert students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can update students" ON public.students;
CREATE POLICY "Admins can update students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can delete students" ON public.students;
CREATE POLICY "Admins can delete students"
  ON public.students FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

-- 7. RLS Policies: library_settings
DROP POLICY IF EXISTS "Public and authenticated can read library settings" ON public.library_settings;
CREATE POLICY "Public and authenticated can read library settings"
  ON public.library_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update library settings" ON public.library_settings;
CREATE POLICY "Admins can update library settings"
  ON public.library_settings FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- 8. RLS Policies: book_rentals
DROP POLICY IF EXISTS "Students can view their own rentals" ON public.book_rentals;
CREATE POLICY "Students can view their own rentals"
  ON public.book_rentals FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all rentals" ON public.book_rentals;
CREATE POLICY "Admins can view all rentals"
  ON public.book_rentals FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can insert rentals" ON public.book_rentals;
CREATE POLICY "Admins can insert rentals"
  ON public.book_rentals FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can update rentals" ON public.book_rentals;
CREATE POLICY "Admins can update rentals"
  ON public.book_rentals FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can delete rentals" ON public.book_rentals;
CREATE POLICY "Admins can delete rentals"
  ON public.book_rentals FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

