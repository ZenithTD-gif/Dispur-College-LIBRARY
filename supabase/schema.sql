-- ============================================================================
-- Dispur College - Department of Professional Studies Digital Library
-- Clean Supabase PostgreSQL Schema with RBAC (Admin & Student)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- 2. Base Users & Roles Table (Linked directly to auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  full_name text NOT NULL CHECK (char_length(trim(full_name)) >= 2),
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- ----------------------------------------------------------------------------
-- 3. Administrator Profiles Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) >= 2),
  email text NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'editor')),
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);

-- ----------------------------------------------------------------------------
-- 4. Student Profiles Table (Academic Details & Identification)
-- ----------------------------------------------------------------------------
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_reg_no_lower ON public.students (lower(trim(registration_number)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_roll_no_lower ON public.students (lower(trim(college_roll_number)));
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_created_at_desc ON public.students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_full_name_trgm ON public.students USING gin (full_name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 5. Book Categories & Classification Metadata
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL UNIQUE CHECK (char_length(trim(category_name)) >= 2),
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'BookOpen',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- ----------------------------------------------------------------------------
-- 6. Book Uploads & Catalog
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(trim(title)) >= 2),
  author text NOT NULL CHECK (char_length(trim(author)) >= 2),
  description text NOT NULL CHECK (char_length(trim(description)) >= 5),
  subject text NOT NULL CHECK (char_length(trim(subject)) >= 2),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  publisher text,
  publication_year integer CHECK (publication_year IS NULL OR (publication_year >= 1400 AND publication_year <= 2100)),
  isbn text,
  language text NOT NULL DEFAULT 'English',
  page_count integer CHECK (page_count IS NULL OR page_count > 0),
  cover_image_path text,
  file_storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'epub')),
  mime_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  allow_download boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  download_count integer NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_category_id ON public.books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_created_at_desc ON public.books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_is_featured ON public.books(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_books_file_type ON public.books(file_type);
CREATE INDEX IF NOT EXISTS idx_books_subject ON public.books(subject);
CREATE INDEX IF NOT EXISTS idx_books_title_trgm ON public.books USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_author_trgm ON public.books USING gin (author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_fts ON public.books USING gin (
  to_tsvector(
    'english',
    coalesce(title, '') || ' ' ||
    coalesce(author, '') || ' ' ||
    coalesce(subject, '') || ' ' ||
    coalesce(publisher, '') || ' ' ||
    coalesce(description, '')
  )
);

-- ----------------------------------------------------------------------------
-- 7. Storage Assets Metadata (Book Covers & Uploaded Files)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
  asset_kind text NOT NULL CHECK (asset_kind IN ('book_file', 'cover_image')),
  bucket_name text NOT NULL CHECK (bucket_name IN ('book-files', 'book-covers')),
  storage_path text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_assets_book_id ON public.storage_assets(book_id);

-- ----------------------------------------------------------------------------
-- 8. Library Operational Settings & Policy Metadata
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.library_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_fine_rate numeric(10, 2) NOT NULL DEFAULT 5.00 CHECK (daily_fine_rate >= 0),
  borrowing_period_days integer NOT NULL DEFAULT 7 CHECK (borrowing_period_days > 0),
  max_books_per_student integer NOT NULL DEFAULT 3 CHECK (max_books_per_student > 0),
  currency_symbol text NOT NULL DEFAULT '₹',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.library_settings (id, daily_fine_rate, borrowing_period_days, max_books_per_student, currency_symbol)
VALUES (1, 5.00, 7, 3, '₹')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. Book Rentals & Borrowing Management
-- ----------------------------------------------------------------------------
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
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  returned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_rentals_student_id ON public.book_rentals(student_id);
CREATE INDEX IF NOT EXISTS idx_book_rentals_book_id ON public.book_rentals(book_id);
CREATE INDEX IF NOT EXISTS idx_book_rentals_status ON public.book_rentals(status);
CREATE INDEX IF NOT EXISTS idx_book_rentals_due_date ON public.book_rentals(due_date);
CREATE INDEX IF NOT EXISTS idx_book_rentals_created_at_desc ON public.book_rentals(created_at DESC);

-- ----------------------------------------------------------------------------
-- 10. Audit Logging & Security Trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON public.audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 11. Trigger Functions (updated_at & User Synchronization)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_library_settings_updated_at ON public.library_settings;
CREATE TRIGGER trg_library_settings_updated_at
  BEFORE UPDATE ON public.library_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_book_rentals_updated_at ON public.book_rentals;
CREATE TRIGGER trg_book_rentals_updated_at
  BEFORE UPDATE ON public.book_rentals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-synchronize role tables into unified public.users
CREATE OR REPLACE FUNCTION public.sync_admin_to_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.name, 'admin', NEW.is_active, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = 'admin',
      is_active = EXCLUDED.is_active,
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_to_users ON public.admin_users;
CREATE TRIGGER trg_sync_admin_to_users
  AFTER INSERT OR UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_to_users();

CREATE OR REPLACE FUNCTION public.sync_student_to_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.full_name, 'student', NEW.is_active, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = 'student',
      is_active = EXCLUDED.is_active,
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_to_users ON public.students;
CREATE TRIGGER trg_sync_student_to_users
  AFTER INSERT OR UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.sync_student_to_users();

-- Populate existing rows into public.users if not present
INSERT INTO public.users (id, email, full_name, role, is_active, created_at, updated_at)
SELECT id, email, name, 'admin', is_active, created_at, updated_at
FROM public.admin_users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = 'admin',
    is_active = EXCLUDED.is_active;

INSERT INTO public.users (id, email, full_name, role, is_active, created_at, updated_at)
SELECT id, email, full_name, 'student', is_active, created_at, updated_at
FROM public.students
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = 'student',
    is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 12. Security Helper Functions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE id = auth.uid()
      AND is_active = true
  ) OR EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated, service_role;

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
  ) OR EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'student'
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_student() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_student() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_admin_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE id = auth.uid()
      AND is_active = true
      AND role = ANY(allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.has_admin_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_admin_role(text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.users
  WHERE id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_book_metric(p_book_id uuid, p_metric text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_metric = 'view' THEN
    UPDATE public.books
    SET view_count = view_count + 1
    WHERE id = p_book_id;
  ELSIF p_metric = 'download' THEN
    UPDATE public.books
    SET download_count = download_count + 1
    WHERE id = p_book_id AND allow_download = true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_book_metric(uuid, text) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 13. Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: users
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
CREATE POLICY "Users can read their own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
CREATE POLICY "Admins can manage users"
  ON public.users FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Policies: admin_users
DROP POLICY IF EXISTS "Admins can view admin directory" ON public.admin_users;
CREATE POLICY "Admins can view admin directory"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Super admins can manage admin directory" ON public.admin_users;
CREATE POLICY "Super admins can manage admin directory"
  ON public.admin_users FOR ALL
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin']))
  WITH CHECK (public.has_admin_role(ARRAY['super_admin']));

-- Policies: students
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

DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;
CREATE POLICY "Admins can manage all students"
  ON public.students FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Policies: categories
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Policies: books
DROP POLICY IF EXISTS "Public can view books" ON public.books;
CREATE POLICY "Public can view books"
  ON public.books FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage books" ON public.books;
CREATE POLICY "Admins can manage books"
  ON public.books FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Policies: storage_assets
DROP POLICY IF EXISTS "Admins can view storage assets" ON public.storage_assets;
CREATE POLICY "Admins can view storage assets"
  ON public.storage_assets FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can manage storage assets" ON public.storage_assets;
CREATE POLICY "Admins can manage storage assets"
  ON public.storage_assets FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Policies: library_settings
DROP POLICY IF EXISTS "Public can read library settings" ON public.library_settings;
CREATE POLICY "Public can read library settings"
  ON public.library_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update library settings" ON public.library_settings;
CREATE POLICY "Admins can update library settings"
  ON public.library_settings FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Policies: book_rentals
DROP POLICY IF EXISTS "Students can view their own rentals" ON public.book_rentals;
CREATE POLICY "Students can view their own rentals"
  ON public.book_rentals FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all book rentals" ON public.book_rentals;
CREATE POLICY "Admins can manage all book rentals"
  ON public.book_rentals FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Policies: audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

-- ----------------------------------------------------------------------------
-- 14. Cloud Storage Buckets & Policies
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-files',
  'book-files',
  false,
  104857600,
  ARRAY['application/pdf', 'application/epub+zip']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view book covers" ON storage.objects;
CREATE POLICY "Public can view book covers"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'book-covers');

DROP POLICY IF EXISTS "Admins can manage book covers" ON storage.objects;
CREATE POLICY "Admins can manage book covers"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'book-covers' AND public.is_active_admin())
  WITH CHECK (bucket_id = 'book-covers' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins can read private book files" ON storage.objects;
CREATE POLICY "Admins can read private book files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'book-files' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins can manage private book files" ON storage.objects;
CREATE POLICY "Admins can manage private book files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'book-files' AND public.is_active_admin())
  WITH CHECK (bucket_id = 'book-files' AND public.is_active_admin());
