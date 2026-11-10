export type AdminRole = 'super_admin' | 'admin' | 'editor';

export type BookFileType = 'pdf' | 'epub';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  category_name: string;
  slug: string;
  description: string;
  icon_name: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithCount extends Category {
  book_count: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  subject: string;
  category_id: string;
  publisher: string | null;
  publication_year: number | null;
  isbn: string | null;
  language: string;
  page_count: number | null;
  cover_image_path: string | null;
  file_storage_path: string;
  file_name: string;
  file_type: BookFileType;
  mime_type: string;
  file_size: number;
  allow_download: boolean;
  is_featured: boolean;
  view_count: number;
  download_count: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookWithCategory extends Book {
  category: Pick<Category, 'id' | 'category_name' | 'slug' | 'icon_name'> | null;
  cover_url: string | null;
}

export interface StorageAsset {
  id: string;
  book_id: string | null;
  asset_kind: 'book_file' | 'cover_image';
  bucket_name: 'book-files' | 'book-covers';
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export type CatalogSortOption = 'newest' | 'oldest' | 'title_asc' | 'most_viewed';

export interface CatalogQueryParams {
  q?: string;
  category?: string;
  subject?: string;
  format?: 'all' | 'pdf' | 'epub';
  downloadable?: 'all' | 'true';
  sort?: CatalogSortOption;
  page?: number;
  limit?: number;
}

export interface CatalogResult {
  books: BookWithCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  subjects: string[];
}

export interface AdminOverviewStats {
  totalBooks: number;
  totalPdfs: number;
  totalEpubs: number;
  totalCategories: number;
  downloadableBooks: number;
  totalStorageBytes: number;
}

