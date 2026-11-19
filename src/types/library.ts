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
  issue_duration_days?: number;
  fine_per_day?: number;
  total_copies?: number;
  available_copies?: number;
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

export type RentalStatus = 'issued' | 'returned' | 'overdue' | 'lost';

export interface Student {
  id: string;
  full_name: string;
  registration_number: string;
  college_roll_number: string;
  department: string;
  semester: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LibrarySettings {
  id: number;
  daily_fine_rate: number;
  borrowing_period_days: number;
  max_books_per_student: number;
  currency_symbol: string;
  updated_at: string;
  updated_by: string | null;
}

export interface BookRental {
  id: string;
  student_id: string;
  book_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: RentalStatus;
  daily_fine_rate_snapshot: number;
  fine_amount: number;
  fine_paid: boolean;
  notes: string | null;
  issued_by: string | null;
  returned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookRentalWithDetails extends BookRental {
  book?: {
    id: string;
    title: string;
    author: string;
    subject: string;
    cover_image_path: string | null;
    cover_url?: string | null;
    file_type: BookFileType;
    allow_download: boolean;
    file_storage_path?: string;
  } | null;
  student?: Pick<
    Student,
    | 'id'
    | 'full_name'
    | 'registration_number'
    | 'college_roll_number'
    | 'department'
    | 'semester'
    | 'email'
    | 'phone'
  > | null;
  remaining_days: number;
  overdue_days: number;
  calculated_fine: number;
  is_overdue: boolean;
}

export interface StudentDashboardData {
  student: Student;
  activeRentals: BookRentalWithDetails[];
  historyRentals: BookRentalWithDetails[];
  totalOutstandingFine: number;
  activeLoanCount: number;
  overdueLoanCount: number;
  settings: LibrarySettings;
}

export interface RentalOverviewStats {
  totalRentals: number;
  activeRentals: number;
  overdueRentals: number;
  returnedRentals: number;
  totalStudents: number;
  totalOutstandingFines: number;
}

export interface BookIssue {
  id: string;
  student_id: string;
  book_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: 'issued' | 'returned' | 'overdue' | 'lost';
  issue_duration_days: number;
  fine_per_day: number;
  fine_amount: number;
  fine_paid: boolean;
  notes: string | null;
  issued_by: string | null;
  returned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FineRecord {
  id: string;
  issue_id: string;
  student_id: string;
  book_id: string;
  days_overdue: number;
  rate_per_day: number;
  fine_amount: number;
  status: 'pending' | 'paid' | 'waived';
  calculated_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ReminderType = 'due_soon_24h' | 'overdue_alert';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface BookReturnReminder {
  id: string;
  issue_id: string;
  student_id: string;
  book_id: string;
  due_date: string;
  reminder_type: ReminderType;
  status: ReminderStatus;
  recipient_email: string;
  student_name: string;
  book_title: string;
  email_id: string | null;
  sent_at: string | null;
  retry_count: number;
  last_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}


