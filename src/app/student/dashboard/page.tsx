import { redirect } from 'next/navigation';
import { StudentDashboardView } from '@/components/student/StudentDashboardView';
import { getCurrentStudent } from '@/lib/auth/student';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getPublicCoverUrl } from '@/lib/supabase/storage';
import { syncServerSideFineRecord } from '@/lib/services/fine-calculator';
import type {
  BookRentalWithDetails,
  BookWithCategory,
  Category,
  LibrarySettings,
} from '@/types/library';
import type { RawBookRow } from '@/lib/queries/mappers';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  if (!isSupabaseConfigured()) {
    redirect('/student/login');
  }

  const auth = await getCurrentStudent();
  if (!auth) {
    redirect('/student/login');
  }

  const { student } = auth;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    redirect('/student/login');
  }

  // 1. Fetch library settings
  const { data: rawSettings } = await adminClient
    .from('library_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  const settings: LibrarySettings = rawSettings
    ? {
        ...rawSettings,
        daily_fine_rate: Number(rawSettings.daily_fine_rate),
        borrowing_period_days: Number(rawSettings.borrowing_period_days),
        max_books_per_student: Number(rawSettings.max_books_per_student),
      }
    : {
        id: 1,
        daily_fine_rate: 5,
        borrowing_period_days: 7,
        max_books_per_student: 3,
        currency_symbol: '₹',
        updated_at: new Date().toISOString(),
        updated_by: null,
      };

  // 2. Fetch student's issues / rentals
  const { data: issuesData } = await adminClient
    .from('book_issues')
    .select(`
      *,
      book:books (
        id,
        title,
        author,
        subject,
        cover_image_path,
        file_type,
        allow_download,
        issue_duration_days,
        fine_per_day,
        total_copies,
        available_copies
      )
    `)
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });

  const activeRentals: BookRentalWithDetails[] = [];
  const historyRentals: BookRentalWithDetails[] = [];
  let totalOutstandingFine = 0;
  let overdueLoanCount = 0;

  for (const raw of issuesData || []) {
    const ratePerDay = Number(raw.fine_per_day || settings.daily_fine_rate || 5.0);
    const syncRes = await syncServerSideFineRecord(adminClient, {
      id: raw.id,
      student_id: raw.student_id,
      book_id: raw.book_id,
      issue_date: raw.issue_date,
      due_date: raw.due_date,
      return_date: raw.return_date,
      status: raw.status,
      fine_per_day: ratePerDay,
      fine_paid: raw.fine_paid,
    });

    const bookObj = raw.book
      ? {
          ...raw.book,
          cover_url: getPublicCoverUrl(raw.book.cover_image_path),
        }
      : null;

    const rentalWithDetails: BookRentalWithDetails = {
      ...raw,
      daily_fine_rate_snapshot: ratePerDay,
      fine_amount: syncRes.fineAmount,
      book: bookObj,
      remaining_days: syncRes.remainingDays,
      overdue_days: syncRes.overdueDays,
      calculated_fine: syncRes.fineAmount,
      is_overdue: syncRes.isOverdue,
      status: syncRes.status,
    };

    if (syncRes.status === 'issued' || syncRes.status === 'overdue') {
      activeRentals.push(rentalWithDetails);
      if (syncRes.isOverdue) {
        overdueLoanCount++;
        totalOutstandingFine += syncRes.fineAmount;
      }
    } else {
      historyRentals.push(rentalWithDetails);
      if (!raw.fine_paid && syncRes.fineAmount > 0) {
        totalOutstandingFine += syncRes.fineAmount;
      }
    }
  }

  // 3. Fetch categories and catalog books for the "My Issue" section
  const [{ data: categoriesData }, { data: catalogBooksData }] = await Promise.all([
    adminClient.from('categories').select('*').order('category_name'),
    adminClient
      .from('books')
      .select('*, categories(id, category_name, slug, icon_name)')
      .order('title'),
  ]);

  const catalogBooks: BookWithCategory[] = (
    (catalogBooksData as RawBookRow[] | null) ?? []
  ).map((b) => ({
    ...b,
    cover_url: getPublicCoverUrl(b.cover_image_path),
    category: b.categories ?? null,
  }));

  return (
    <StudentDashboardView
      initialStudent={student}
      initialActiveRentals={activeRentals}
      initialHistoryRentals={historyRentals}
      initialSettings={settings}
      initialTotalFine={totalOutstandingFine}
      initialOverdueCount={overdueLoanCount}
      initialCategories={(categoriesData as Category[]) || []}
      initialCatalogBooks={catalogBooks}
    />
  );
}
