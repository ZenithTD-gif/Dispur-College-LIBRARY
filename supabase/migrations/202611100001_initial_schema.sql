-- ============================================================================
-- Professional Studies Department - Digital Library (Dispur College, Assam)
-- Initial Relational Schema, Indexes, RLS Policies, Functions & Storage Buckets
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) >= 2),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'editor')),
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL UNIQUE CHECK (char_length(trim(category_name)) >= 2),
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'BookOpen',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Books Table
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
  uploaded_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Storage Assets Metadata Table
CREATE TABLE IF NOT EXISTS public.storage_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
  asset_kind text NOT NULL CHECK (asset_kind IN ('book_file', 'cover_image')),
  bucket_name text NOT NULL CHECK (bucket_name IN ('book-files', 'book-covers')),
  storage_path text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  uploaded_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Indexes for Fast Querying & Search
CREATE INDEX IF NOT EXISTS idx_books_category_id ON public.books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_created_at_desc ON public.books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_is_featured ON public.books(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_books_file_type ON public.books(file_type);
CREATE INDEX IF NOT EXISTS idx_books_subject ON public.books(subject);
CREATE INDEX IF NOT EXISTS idx_books_title_trgm ON public.books USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_author_trgm ON public.books USING gin (author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_subject_trgm ON public.books USING gin (subject gin_trgm_ops);
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
CREATE INDEX IF NOT EXISTS idx_storage_assets_book_id ON public.storage_assets(book_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON public.audit_logs(created_at DESC);

-- 8. Updated-at Trigger Function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Security Helper Functions (SECURITY DEFINER avoids recursive RLS evaluation)
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
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated, service_role;

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

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies: admin_users
DROP POLICY IF EXISTS "Admins can view admin directory" ON public.admin_users;
CREATE POLICY "Admins can view admin directory"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Super admins can insert admin users" ON public.admin_users;
CREATE POLICY "Super admins can insert admin users"
  ON public.admin_users FOR INSERT
  TO authenticated
  WITH CHECK (public.has_admin_role(ARRAY['super_admin']));

DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;
CREATE POLICY "Super admins can update admin users"
  ON public.admin_users FOR UPDATE
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin']))
  WITH CHECK (public.has_admin_role(ARRAY['super_admin']));

DROP POLICY IF EXISTS "Super admins can delete admin users" ON public.admin_users;
CREATE POLICY "Super admins can delete admin users"
  ON public.admin_users FOR DELETE
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin']) AND id <> auth.uid());

-- 12. RLS Policies: categories
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Active admins can insert categories" ON public.categories;
CREATE POLICY "Active admins can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Active admins can update categories" ON public.categories;
CREATE POLICY "Active admins can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins and super admins can delete categories" ON public.categories;
CREATE POLICY "Admins and super admins can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin', 'admin']));

-- 13. RLS Policies: books
DROP POLICY IF EXISTS "Public can read books" ON public.books;
CREATE POLICY "Public can read books"
  ON public.books FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Active admins can insert books" ON public.books;
CREATE POLICY "Active admins can insert books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Active admins can update books" ON public.books;
CREATE POLICY "Active admins can update books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins and super admins can delete books" ON public.books;
CREATE POLICY "Admins and super admins can delete books"
  ON public.books FOR DELETE
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin', 'admin']));

-- 14. RLS Policies: storage_assets
DROP POLICY IF EXISTS "Active admins can view storage assets" ON public.storage_assets;
CREATE POLICY "Active admins can view storage assets"
  ON public.storage_assets FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Active admins can insert storage assets" ON public.storage_assets;
CREATE POLICY "Active admins can insert storage assets"
  ON public.storage_assets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins and super admins can delete storage assets" ON public.storage_assets;
CREATE POLICY "Admins and super admins can delete storage assets"
  ON public.storage_assets FOR DELETE
  TO authenticated
  USING (public.has_admin_role(ARRAY['super_admin', 'admin']));

-- 15. RLS Policies: audit_logs
DROP POLICY IF EXISTS "Active admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Active admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Active admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Active admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

-- 16. Cloud Storage Buckets (Supabase Storage)
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

-- 17. Storage Object RLS Policies
DROP POLICY IF EXISTS "Public can view book covers" ON storage.objects;
CREATE POLICY "Public can view book covers"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'book-covers');

DROP POLICY IF EXISTS "Active admins can upload book covers" ON storage.objects;
CREATE POLICY "Active admins can upload book covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'book-covers' AND public.is_active_admin());

DROP POLICY IF EXISTS "Active admins can update book covers" ON storage.objects;
CREATE POLICY "Active admins can update book covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'book-covers' AND public.is_active_admin());

DROP POLICY IF EXISTS "Active admins can delete book covers" ON storage.objects;
CREATE POLICY "Active admins can delete book covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'book-covers' AND public.has_admin_role(ARRAY['super_admin', 'admin']));

DROP POLICY IF EXISTS "Active admins can read private book files" ON storage.objects;
CREATE POLICY "Active admins can read private book files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'book-files' AND public.is_active_admin());

DROP POLICY IF EXISTS "Active admins can upload private book files" ON storage.objects;
CREATE POLICY "Active admins can upload private book files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'book-files' AND public.is_active_admin());

DROP POLICY IF EXISTS "Active admins can update private book files" ON storage.objects;
CREATE POLICY "Active admins can update private book files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'book-files' AND public.is_active_admin());

DROP POLICY IF EXISTS "Active admins can delete private book files" ON storage.objects;
CREATE POLICY "Active admins can delete private book files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'book-files' AND public.has_admin_role(ARRAY['super_admin', 'admin']));

