'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  BookPlus,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  GraduationCap,
  History,
  KeyRound,
  Library,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  Square,
  X,
} from 'lucide-react';
import { BookCover } from '@/components/shared/BookCover';
import { DispurCollegeLogo } from '@/components/shared/DispurCollegeLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type {
  BookRentalWithDetails,
  BookWithCategory,
  Category,
  LibrarySettings,
  Student,
} from '@/types/library';

const SEMESTERS = [
  '1st Semester',
  '2nd Semester',
  '3rd Semester',
  '4th Semester',
  '5th Semester',
  '6th Semester',
];

export function StudentDashboardView({
  initialStudent,
  initialActiveRentals,
  initialHistoryRentals,
  initialSettings,
  initialTotalFine,
  initialOverdueCount,
  initialCategories = [],
  initialCatalogBooks = [],
}: {
  initialStudent: Student;
  initialActiveRentals: BookRentalWithDetails[];
  initialHistoryRentals: BookRentalWithDetails[];
  initialSettings: LibrarySettings;
  initialTotalFine: number;
  initialOverdueCount: number;
  initialCategories?: Category[];
  initialCatalogBooks?: BookWithCategory[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'issue' | 'active' | 'history' | 'profile' | 'policy'
  >('issue');

  const [student, setStudent] = useState<Student>(initialStudent);
  const [activeRentals, setActiveRentals] = useState<BookRentalWithDetails[]>(
    initialActiveRentals
  );
  const [historyRentals, setHistoryRentals] = useState<BookRentalWithDetails[]>(
    initialHistoryRentals
  );
  const [settings] = useState<LibrarySettings>(initialSettings);
  const [totalFine, setTotalFine] = useState<number>(initialTotalFine);
  const [overdueCount, setOverdueCount] = useState<number>(initialOverdueCount);

  // My Issue catalog browsing state
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [catalogBooks, setCatalogBooks] = useState<BookWithCategory[]>(
    initialCatalogBooks
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [issuingBooks, setIssuingBooks] = useState<boolean>(false);
  const [issueMessage, setIssueMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const activeBookIdSet = new Set(activeRentals.map((r) => r.book_id));
  const remainingAllowance = Math.max(
    0,
    settings.max_books_per_student - activeRentals.length
  );

  async function refreshStudentDashboard() {
    try {
      const res = await fetch('/api/student/dashboard', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStudent(data.student);
        setActiveRentals(data.activeRentals || []);
        setHistoryRentals(data.historyRentals || []);
        setTotalFine(data.totalOutstandingFine || 0);
        setOverdueCount(data.overdueLoanCount || 0);
        if (data.categories) setCategories(data.categories);
        if (data.catalogBooks) setCatalogBooks(data.catalogBooks);
      }
    } catch {
      // Ignore network errors on passive refresh
    }
  }

  // Multi-book selection toggle
  function toggleBookSelection(bookId: string) {
    if (activeBookIdSet.has(bookId)) return;
    setIssueMessage(null);

    setSelectedBookIds((prev) => {
      if (prev.includes(bookId)) {
        return prev.filter((id) => id !== bookId);
      }
      if (prev.length >= remainingAllowance) {
        setIssueMessage({
          type: 'error',
          text: `You can only select up to ${remainingAllowance} more book(s) within your maximum limit of ${settings.max_books_per_student}.`,
        });
        return prev;
      }
      return [...prev, bookId];
    });
  }

  // Issue books action handler
  async function handleIssueBooks(bookIdsToIssue: string[]) {
    if (bookIdsToIssue.length === 0) return;
    setIssuingBooks(true);
    setIssueMessage(null);

    try {
      const res = await fetch('/api/student/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookIds: bookIdsToIssue }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIssueMessage({
          type: 'error',
          text: data.error || 'Failed to issue the requested book(s).',
        });
      } else {
        setIssueMessage({
          type: 'success',
          text:
            data.message ||
            `Successfully issued ${bookIdsToIssue.length} book(s)!`,
        });
        setSelectedBookIds([]);
        await refreshStudentDashboard();
      }
    } catch (err) {
      setIssueMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while issuing books.',
      });
    } finally {
      setIssuingBooks(false);
    }
  }

  // Filtered catalog books for browsing
  const filteredCatalogBooks = catalogBooks.filter((book) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      book.category_id === selectedCategory ||
      book.category?.slug === selectedCategory;

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      book.title.toLowerCase().includes(q) ||
      book.author.toLowerCase().includes(q) ||
      book.subject.toLowerCase().includes(q) ||
      (book.isbn && book.isbn.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  // Edit profile state
  const [editFullName, setEditFullName] = useState(student.full_name);
  const [editDepartment, setEditDepartment] = useState(student.department);
  const [editSemester, setEditSemester] = useState(student.semester);
  const [editPhone, setEditPhone] = useState(student.phone);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed with navigation
    } finally {
      router.push('/student/login');
      router.refresh();
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editFullName,
          department: editDepartment,
          semester: editSemester,
          phone: editPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'Failed to update profile information.');
      } else {
        setProfileSuccess('Profile details updated successfully.');
        setStudent(data.student);
      }
    } catch {
      setProfileError('Network error while updating profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  }

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="relative min-h-screen bg-charcoal-950 text-offwhite-100 selection:bg-maroon-700 selection:text-white">
      {/* Background ambient liquid glass glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-maroon-900/25 blur-[120px]" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-burgundy-800/20 blur-[130px]" />
        <div className="absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-champagne-400/10 blur-[110px]" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-offwhite-100/[0.1] bg-charcoal-950/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/library" className="group flex items-center gap-3">
              <DispurCollegeLogo size="sm" />
              <div>
                <p className="font-serif text-sm font-bold text-offwhite-50 leading-tight group-hover:text-champagne-200 transition-colors">
                  Dispur College Library
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-champagne-300">
                  Student Portal
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/library/browse"
              className="glass-btn px-3 py-1.5 text-xs hidden sm:inline-flex"
            >
              <Library className="h-3.5 w-3.5 text-champagne-300" />
              <span>Full Catalog</span>
            </Link>

            <button
              type="button"
              onClick={refreshStudentDashboard}
              className="glass-btn p-2 text-offwhite-300 hover:text-white"
              title="Refresh borrowing status"
              aria-label="Refresh dashboard"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="glass-btn px-3 py-1.5 text-xs text-rose-300 hover:border-rose-400/40 hover:text-rose-200"
            >
              {signingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Welcome Header */}
        <section className="liquid-glass p-6 sm:p-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-offwhite-100/[0.1] pb-5">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-700 to-burgundy-800 text-champagne-200 shadow-md border border-champagne-300/30">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-offwhite-50">
                  Welcome, {student.full_name}
                </h1>
                <p className="text-xs text-offwhite-300/90 mt-0.5">
                  {student.department} • {student.semester} • GU Reg No:{' '}
                  <span className="font-mono font-semibold text-champagne-300">
                    {student.registration_number}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="glass-pill text-xs">
                Roll:{' '}
                <strong className="text-offwhite-50 font-mono">
                  {student.college_roll_number}
                </strong>
              </span>
              <span className="glass-pill text-xs">
                Status:{' '}
                <strong className="text-emerald-400">Active Student</strong>
              </span>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="flex items-center gap-2 text-xs text-champagne-200/90 bg-champagne-400/10 rounded-xl px-3.5 py-2 border border-champagne-300/20">
            <Clock className="h-4 w-4 text-champagne-300 shrink-0" />
            <span>
              <strong>Free Borrowing Policy:</strong> Issued books can be kept
              for <strong>{settings.borrowing_period_days} days free of charge</strong>.
              Late returns incur a fee of ₹{settings.daily_fine_rate}/day.
            </span>
          </div>
        </section>

        {/* 4 KPI Frosted Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Currently Issued Books */}
          <div className="liquid-glass p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-offwhite-300">
                Currently Issued
              </span>
              <div className="rounded-full bg-champagne-400/15 p-2 text-champagne-300">
                <BookMarked className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-offwhite-50">
                {activeRentals.length}{' '}
                <span className="text-xs font-normal text-offwhite-400">
                  / {settings.max_books_per_student} max
                </span>
              </p>
              <p className="mt-1 text-xs text-offwhite-300/80">
                {activeRentals.length === 0
                  ? 'No books currently checked out'
                  : `${activeRentals.length} book(s) in your possession`}
              </p>
            </div>
          </div>

          {/* Card 2: Free Borrowing Status */}
          <div className="liquid-glass p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-offwhite-300">
                Borrowing Policy
              </span>
              <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-emerald-300">
                {settings.borrowing_period_days} Days
              </p>
              <p className="mt-1 text-xs text-offwhite-300/80">
                100% Free borrowing period before late fines apply
              </p>
            </div>
          </div>

          {/* Card 3: Overdue Books */}
          <div
            className={`liquid-glass p-5 space-y-3 ${
              overdueCount > 0
                ? 'border-wine-500/50 bg-gradient-to-br from-wine-950/60 to-charcoal-900/60'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-offwhite-300">
                Overdue Books
              </span>
              <div
                className={`rounded-full p-2 ${
                  overdueCount > 0
                    ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                    : 'bg-offwhite-100/10 text-offwhite-400'
                }`}
              >
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p
                className={`font-mono text-3xl font-bold ${
                  overdueCount > 0 ? 'text-rose-300' : 'text-offwhite-50'
                }`}
              >
                {overdueCount}
              </p>
              <p className="mt-1 text-xs text-offwhite-300/80">
                {overdueCount > 0
                  ? 'Books past the free return deadline'
                  : 'All loans are on schedule'}
              </p>
            </div>
          </div>

          {/* Card 4: Total Outstanding Fine */}
          <div
            className={`liquid-glass p-5 space-y-3 ${
              totalFine > 0
                ? 'border-champagne-400/50 bg-gradient-to-br from-champagne-950/40 to-charcoal-900/60'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-offwhite-300">
                Outstanding Fine
              </span>
              <div
                className={`rounded-full p-2 ${
                  totalFine > 0
                    ? 'bg-champagne-400/20 text-champagne-200'
                    : 'bg-emerald-500/15 text-emerald-400'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p
                className={`font-mono text-3xl font-bold ${
                  totalFine > 0 ? 'text-champagne-200' : 'text-emerald-300'
                }`}
              >
                ₹{totalFine.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-offwhite-300/80">
                {totalFine > 0
                  ? `Late fee rate: ₹${settings.daily_fine_rate}/day overdue`
                  : 'No outstanding fines due'}
              </p>
            </div>
          </div>
        </section>

        {/* Dashboard Tabs */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-offwhite-100/[0.1] pb-3">
            {/* NEW TAB: My Issue */}
            <button
              type="button"
              onClick={() => setActiveTab('issue')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${
                activeTab === 'issue'
                  ? 'border border-champagne-300/40 bg-gradient-to-r from-maroon-800/80 to-burgundy-700/75 text-offwhite-50 shadow-card'
                  : 'text-offwhite-300 hover:bg-offwhite-100/[0.08] hover:text-white'
              }`}
            >
              <BookPlus className="h-3.5 w-3.5 text-champagne-300" />
              <span>My Issue (Browse & Borrow)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                activeTab === 'active'
                  ? 'border border-champagne-300/40 bg-gradient-to-r from-maroon-800/80 to-burgundy-700/75 text-offwhite-50 shadow-card'
                  : 'text-offwhite-300 hover:bg-offwhite-100/[0.08] hover:text-white'
              }`}
            >
              Currently Issued Books ({activeRentals.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                activeTab === 'history'
                  ? 'border border-champagne-300/40 bg-gradient-to-r from-maroon-800/80 to-burgundy-700/75 text-offwhite-50 shadow-card'
                  : 'text-offwhite-300 hover:bg-offwhite-100/[0.08] hover:text-white'
              }`}
            >
              Borrowing History ({historyRentals.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                activeTab === 'profile'
                  ? 'border border-champagne-300/40 bg-gradient-to-r from-maroon-800/80 to-burgundy-700/75 text-offwhite-50 shadow-card'
                  : 'text-offwhite-300 hover:bg-offwhite-100/[0.08] hover:text-white'
              }`}
            >
              My Profile & Academic Details
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('policy')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                activeTab === 'policy'
                  ? 'border border-champagne-300/40 bg-gradient-to-r from-maroon-800/80 to-burgundy-700/75 text-offwhite-50 shadow-card'
                  : 'text-offwhite-300 hover:bg-offwhite-100/[0.08] hover:text-white'
              }`}
            >
              Library Policy & Fine Rules
            </button>
          </div>

          {/* TAB 0: My Issue (Browse by Category, Search, & Multi-Issue) */}
          {activeTab === 'issue' && (
            <div className="space-y-5">
              {/* Feedback Alert Banner */}
              {issueMessage && (
                <div
                  role="alert"
                  className={`flex items-start justify-between gap-3 rounded-2xl p-4 text-xs backdrop-blur-xl border ${
                    issueMessage.type === 'success'
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                      : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {issueMessage.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <p className="leading-relaxed font-medium">
                      {issueMessage.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIssueMessage(null)}
                    className="text-offwhite-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Multi-Book Sticky Selection Bar */}
              {selectedBookIds.length > 0 && (
                <div className="sticky top-20 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-champagne-300/40 bg-maroon-950/90 p-4 shadow-2xl backdrop-blur-2xl animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-champagne-400/20 text-champagne-300 border border-champagne-300/30">
                      <CheckSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-offwhite-50">
                        {selectedBookIds.length} book(s) selected to issue
                      </p>
                      <p className="text-xs text-offwhite-300">
                        Remaining allowance:{' '}
                        <strong className="text-champagne-200">
                          {remainingAllowance} book(s)
                        </strong>{' '}
                        (Limit: {settings.max_books_per_student})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBookIds([])}
                      disabled={issuingBooks}
                      className="glass-btn px-3.5 py-2 text-xs"
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIssueBooks(selectedBookIds)}
                      disabled={issuingBooks || selectedBookIds.length === 0}
                      className="glass-btn-accent px-5 py-2 text-xs font-semibold"
                    >
                      {issuingBooks ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          <span>Issuing Books...</span>
                        </>
                      ) : (
                        <span>
                          Issue Selected Books ({selectedBookIds.length})
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Search & Category Filter Controls */}
              <div className="liquid-glass p-5 space-y-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-offwhite-300" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search books by title, author, subject, or ISBN..."
                      className="glass-input pl-10 pr-9 w-full text-xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-offwhite-400 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-offwhite-300">
                      Showing{' '}
                      <strong className="text-champagne-200">
                        {filteredCatalogBooks.length}
                      </strong>{' '}
                      of {catalogBooks.length} titles
                    </span>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-offwhite-100/[0.08]">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      selectedCategory === 'all'
                        ? 'border border-champagne-300/35 bg-gradient-to-r from-maroon-800 to-burgundy-700 text-offwhite-50 shadow-md font-semibold'
                        : 'border border-offwhite-100/10 bg-offwhite-100/[0.04] text-offwhite-300 hover:text-white hover:bg-offwhite-100/[0.08]'
                    }`}
                  >
                    All Categories ({catalogBooks.length})
                  </button>

                  {categories.map((cat) => {
                    const count = catalogBooks.filter(
                      (b) => b.category_id === cat.id
                    ).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                          selectedCategory === cat.id
                            ? 'border border-champagne-300/35 bg-gradient-to-r from-maroon-800 to-burgundy-700 text-offwhite-50 shadow-md font-semibold'
                            : 'border border-offwhite-100/10 bg-offwhite-100/[0.04] text-offwhite-300 hover:text-white hover:bg-offwhite-100/[0.08]'
                        }`}
                      >
                        {cat.category_name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Catalog Books Grid */}
              {filteredCatalogBooks.length === 0 ? (
                <div className="liquid-panel py-16 px-6 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-offwhite-100/[0.08] text-champagne-300">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif text-base font-bold text-offwhite-50">
                    No books matched your filter
                  </h3>
                  <p className="text-xs text-offwhite-300 max-w-sm mx-auto">
                    Try searching with another keyword or select a different
                    category.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                    className="glass-btn px-4 py-2 text-xs mt-2"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCatalogBooks.map((book) => {
                    const isAlreadyIssued = activeBookIdSet.has(book.id);
                    const isSelected = selectedBookIds.includes(book.id);
                    const availableCopies =
                      book.available_copies !== undefined
                        ? book.available_copies
                        : 1;
                    const totalCopies =
                      book.total_copies !== undefined ? book.total_copies : 1;
                    const isOutOfStock = availableCopies <= 0;
                    const durationDays =
                      book.issue_duration_days ||
                      settings.borrowing_period_days ||
                      7;
                    const fineRate =
                      book.fine_per_day !== undefined
                        ? book.fine_per_day
                        : settings.daily_fine_rate || 5.0;

                    return (
                      <div
                        key={book.id}
                        className={`liquid-glass p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 relative ${
                          isSelected
                            ? 'border-champagne-300/60 bg-maroon-950/40 shadow-[0_0_20px_rgba(235,217,178,0.12)]'
                            : ''
                        }`}
                      >
                        {/* Checkbox for Multi-select on Top-Right */}
                        <button
                          type="button"
                          onClick={() => toggleBookSelection(book.id)}
                          disabled={isAlreadyIssued || isOutOfStock}
                          className="absolute top-4 right-4 text-champagne-300 hover:text-white transition-transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            isAlreadyIssued
                              ? 'Already issued'
                              : isOutOfStock
                              ? 'Out of stock'
                              : isSelected
                              ? 'Deselect'
                              : 'Select to issue'
                          }
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-champagne-300" />
                          ) : (
                            <Square className="h-5 w-5 text-offwhite-400" />
                          )}
                        </button>

                        <div className="space-y-3.5 pr-8">
                          <div className="flex gap-3.5 items-start">
                            <div className="w-16 h-22 shrink-0 rounded-lg overflow-hidden border border-offwhite-100/15 shadow-sm">
                              <BookCover
                                fileType={book.file_type}
                                title={book.title}
                                author={book.author}
                                coverUrl={book.cover_url}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <span className="glass-pill text-[10px] text-champagne-300 inline-block truncate max-w-full">
                                {book.category?.category_name ||
                                  book.subject ||
                                  'General'}
                              </span>
                              <h4 className="font-serif text-sm font-bold text-offwhite-50 line-clamp-2 leading-snug">
                                {book.title}
                              </h4>
                              <p className="text-xs text-offwhite-300 truncate">
                                By {book.author}
                              </p>
                            </div>
                          </div>

                          <p className="text-xs text-offwhite-300/80 line-clamp-2">
                            {book.description}
                          </p>
                        </div>

                        {/* Bottom Stock & Action Footer */}
                        <div className="mt-4 pt-3.5 border-t border-offwhite-100/[0.08] space-y-3">
                          {/* Terms & Inventory */}
                          <div className="flex items-center justify-between text-[11px]">
                            <span
                              className={`flex items-center gap-1.5 font-medium ${
                                isOutOfStock
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isOutOfStock
                                    ? 'bg-rose-400'
                                    : 'bg-emerald-400'
                                }`}
                              />
                              {isOutOfStock
                                ? 'Out of Stock'
                                : `${availableCopies} of ${totalCopies} copies available`}
                            </span>
                            <span className="text-offwhite-400">
                              {durationDays} Days Free • ₹{fineRate}/day
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            {isAlreadyIssued ? (
                              <button
                                type="button"
                                disabled
                                className="glass-btn w-full py-2 text-xs opacity-60 cursor-not-allowed text-champagne-300 justify-center"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Already Issued to You</span>
                              </button>
                            ) : isOutOfStock ? (
                              <button
                                type="button"
                                disabled
                                className="glass-btn w-full py-2 text-xs opacity-50 cursor-not-allowed justify-center"
                              >
                                <span>Currently Unavailable</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => toggleBookSelection(book.id)}
                                  className={`glass-btn flex-1 py-2 text-xs justify-center ${
                                    isSelected
                                      ? 'border-champagne-300/40 text-champagne-200'
                                      : ''
                                  }`}
                                >
                                  {isSelected ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Selected</span>
                                    </>
                                  ) : (
                                    <span>+ Select</span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    issuingBooks || remainingAllowance === 0
                                  }
                                  onClick={() => handleIssueBooks([book.id])}
                                  className="glass-btn-accent flex-1 py-2 text-xs font-semibold justify-center"
                                >
                                  Issue Now
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: Currently Issued Books */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {activeRentals.length === 0 ? (
                <div className="liquid-panel py-16 px-6 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-offwhite-100/[0.08] text-champagne-300">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-offwhite-50">
                      No Books Currently Issued
                    </h3>
                    <p className="text-xs text-offwhite-300/85 max-w-md mx-auto">
                      You do not have any physical books borrowed from the
                      department library right now. You can borrow up to{' '}
                      {settings.max_books_per_student} books for 7 days free of
                      charge!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('issue')}
                    className="glass-btn-accent px-5 py-2.5 text-xs inline-flex items-center gap-1.5"
                  >
                    <BookPlus className="h-4 w-4" />
                    <span>Browse & Issue Books Now</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeRentals.map((rental) => (
                    <div
                      key={rental.id}
                      className={`liquid-glass p-5 rounded-2xl flex flex-col justify-between space-y-4 transition-all ${
                        rental.is_overdue
                          ? 'border-wine-500/50 bg-gradient-to-br from-wine-950/40 to-charcoal-900/60'
                          : ''
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Status Pill Header */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`glass-pill text-[10px] font-semibold ${
                              rental.is_overdue
                                ? 'text-rose-300 border-rose-500/40 bg-rose-950/40'
                                : rental.remaining_days <= 1
                                ? 'text-champagne-200 border-champagne-300/40'
                                : 'text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {rental.is_overdue
                              ? `Overdue by ${rental.overdue_days} day(s)`
                              : rental.remaining_days === 0
                              ? 'Due Today'
                              : `${rental.remaining_days} free day(s) remaining`}
                          </span>

                          <span className="text-[11px] font-mono text-offwhite-400">
                            {rental.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Book Details */}
                        <div className="flex gap-3.5">
                          <div className="w-16 h-22 shrink-0 rounded-lg overflow-hidden border border-offwhite-100/15">
                            <BookCover
                              fileType={rental.book?.file_type || 'pdf'}
                              title={rental.book?.title || 'Book'}
                              author={rental.book?.author || ''}
                              coverUrl={rental.book?.cover_url ?? null}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h4 className="font-serif text-sm font-bold text-offwhite-50 line-clamp-2">
                              {rental.book?.title || 'Unknown Title'}
                            </h4>
                            <p className="text-xs text-offwhite-300 truncate">
                              By {rental.book?.author || 'Department Library'}
                            </p>
                            <span className="glass-pill text-[10px] text-offwhite-300">
                              {rental.book?.subject || 'Professional Studies'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Timeline & Fine Details */}
                      <div className="liquid-well p-3 space-y-2 text-xs">
                        <div className="flex justify-between text-offwhite-300">
                          <span>Issue Date:</span>
                          <span className="font-mono text-offwhite-100">
                            {formatDate(rental.issue_date)}
                          </span>
                        </div>
                        <div className="flex justify-between text-offwhite-300">
                          <span>Return Due Date:</span>
                          <span
                            className={`font-mono font-semibold ${
                              rental.is_overdue
                                ? 'text-rose-300'
                                : 'text-champagne-200'
                            }`}
                          >
                            {formatDate(rental.due_date)}
                          </span>
                        </div>
                        {rental.is_overdue && (
                          <div className="flex justify-between text-rose-300 border-t border-rose-500/20 pt-1.5 font-bold">
                            <span>Applicable Late Fine:</span>
                            <span className="font-mono">
                              ₹{rental.calculated_fine.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      {rental.book?.id && (
                        <div className="pt-1 flex gap-2">
                          <Link
                            href={`/library/books/${rental.book.id}`}
                            className="glass-btn flex-1 py-1.5 text-xs justify-center"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Catalog Entry</span>
                          </Link>
                          <Link
                            href={`/library/books/${rental.book.id}/read`}
                            className="glass-btn-accent flex-1 py-1.5 text-xs justify-center font-semibold"
                          >
                            <BookOpen className="h-3 w-3" />
                            <span>Read Online</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Borrowing History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {historyRentals.length === 0 ? (
                <div className="liquid-panel py-16 px-6 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-offwhite-100/[0.08] text-champagne-300">
                    <History className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif text-base font-bold text-offwhite-50">
                    No Borrowing History Found
                  </h3>
                  <p className="text-xs text-offwhite-300/85 max-w-sm mx-auto">
                    Your previous returned books and borrowing activity will
                    appear here once you complete a loan cycle.
                  </p>
                </div>
              ) : (
                <div className="liquid-glass overflow-hidden rounded-2xl border border-offwhite-100/10">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-charcoal-900/80 text-[11px] font-semibold uppercase tracking-wider text-offwhite-300 border-b border-offwhite-100/10">
                        <tr>
                          <th className="py-3 px-4">Book Title</th>
                          <th className="py-3 px-4">Issued On</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4">Returned On</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Fine Settled</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-offwhite-100/[0.06] text-offwhite-200">
                        {historyRentals.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-offwhite-100/[0.03] transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-offwhite-100 max-w-xs truncate">
                              {item.book?.title || 'Unknown Title'}
                            </td>
                            <td className="py-3 px-4 font-mono">
                              {formatDate(item.issue_date)}
                            </td>
                            <td className="py-3 px-4 font-mono">
                              {formatDate(item.due_date)}
                            </td>
                            <td className="py-3 px-4 font-mono text-emerald-300">
                              {formatDate(item.return_date)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="glass-pill text-[10px] text-emerald-400 border-emerald-500/30">
                                {item.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold">
                              {item.fine_amount > 0 ? (
                                <span
                                  className={
                                    item.fine_paid
                                      ? 'text-emerald-400'
                                      : 'text-rose-300'
                                  }
                                >
                                  ₹{item.fine_amount.toFixed(2)}{' '}
                                  {item.fine_paid ? '(Paid)' : '(Unpaid)'}
                                </span>
                              ) : (
                                <span className="text-offwhite-400">₹0.00</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Student Profile & Settings + Issued Books inside Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="liquid-glass p-6 sm:p-7 space-y-5">
                    <div className="border-b border-offwhite-100/[0.1] pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-base font-bold text-offwhite-50">
                          Student Profile & Academic Details
                        </h3>
                        <p className="text-xs text-offwhite-400">
                          View and update permitted personal and departmental
                          details.
                        </p>
                      </div>
                      <span className="glass-pill text-[10px] text-champagne-300">
                        Active Account
                      </span>
                    </div>

                    {profileSuccess && (
                      <div
                        role="status"
                        className="rounded-2xl border border-emerald-500/40 bg-emerald-900/25 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5 backdrop-blur-xl"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                        <p className="leading-relaxed">{profileSuccess}</p>
                      </div>
                    )}

                    {profileError && (
                      <div
                        role="alert"
                        className="rounded-2xl border border-wine-400/45 bg-wine-700/20 p-3.5 text-xs text-rose-200 flex items-start gap-2.5 backdrop-blur-xl"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-300 mt-0.5" />
                        <p className="leading-relaxed">{profileError}</p>
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      {/* Non-editable institutional credentials */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 liquid-well p-3.5">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-offwhite-400 block">
                            GU Registration No.
                          </span>
                          <p className="font-mono text-sm font-bold text-champagne-200 mt-0.5">
                            {student.registration_number}
                          </p>
                          <span className="text-[10px] text-offwhite-400">
                            Institutional Identifier (Fixed)
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-offwhite-400 block">
                            College Roll No.
                          </span>
                          <p className="font-mono text-sm font-bold text-champagne-200 mt-0.5">
                            {student.college_roll_number}
                          </p>
                          <span className="text-[10px] text-offwhite-400">
                            Dispur College Roll Number
                          </span>
                        </div>

                        <div className="sm:col-span-2 border-t border-offwhite-100/[0.08] pt-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-offwhite-400 block">
                            Registered Email Address
                          </span>
                          <p className="text-sm font-medium text-offwhite-100 mt-0.5">
                            {student.email}
                          </p>
                        </div>
                      </div>

                      {/* Editable fields */}
                      <div>
                        <label
                          htmlFor="edit-name"
                          className="block text-xs font-semibold text-offwhite-200 mb-1"
                        >
                          Full Name
                        </label>
                        <input
                          id="edit-name"
                          type="text"
                          required
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="liquid-input text-xs"
                          disabled={savingProfile}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="edit-dept"
                            className="block text-xs font-semibold text-offwhite-200 mb-1"
                          >
                            Department
                          </label>
                          <input
                            id="edit-dept"
                            type="text"
                            required
                            value={editDepartment}
                            onChange={(e) =>
                              setEditDepartment(e.target.value)
                            }
                            className="liquid-input text-xs"
                            disabled={savingProfile}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="edit-semester"
                            className="block text-xs font-semibold text-offwhite-200 mb-1"
                          >
                            Semester
                          </label>
                          <select
                            id="edit-semester"
                            value={editSemester}
                            onChange={(e) => setEditSemester(e.target.value)}
                            className="liquid-input text-xs cursor-pointer"
                            disabled={savingProfile}
                          >
                            {SEMESTERS.map((sem) => (
                              <option key={sem} value={sem}>
                                {sem}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="edit-phone"
                          className="block text-xs font-semibold text-offwhite-200 mb-1"
                        >
                          Mobile Phone Number
                        </label>
                        <input
                          id="edit-phone"
                          type="tel"
                          required
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="liquid-input text-xs font-mono"
                          disabled={savingProfile}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="glass-btn-primary px-5 py-2 text-xs"
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <span>Save Profile Changes</span>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Password & Security Card */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="liquid-glass p-6 space-y-4">
                    <div className="border-b border-offwhite-100/[0.1] pb-3 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-champagne-300" />
                      <h3 className="font-serif text-sm font-bold text-offwhite-50">
                        Security & Password
                      </h3>
                    </div>

                    <p className="text-xs text-offwhite-300 leading-relaxed">
                      You can change your password at any time. Ensure your new
                      password is at least 6 characters long.
                    </p>

                    <Link
                      href="/student/update-password"
                      className="glass-btn w-full justify-center py-2 text-xs"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-champagne-300" />
                      <span>Change Account Password</span>
                    </Link>

                    <div className="liquid-well p-3 text-[11px] text-offwhite-400 space-y-1">
                      <p className="font-semibold text-offwhite-200">
                        Account Security Note
                      </p>
                      <p>
                        Never share your student credentials with other
                        students. You are personally responsible for books
                        borrowed under your registration number.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* REQUIRED: Show Issued Books Inside the Profile */}
              <div className="liquid-glass p-6 sm:p-7 space-y-4 rounded-3xl border border-offwhite-100/15">
                <div className="border-b border-offwhite-100/[0.1] pb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-champagne-400/15 text-champagne-300">
                      <BookMarked className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-offwhite-50">
                        Currently Issued Books in My Profile
                      </h3>
                      <p className="text-xs text-offwhite-300">
                        Active book loans linked directly to your registration
                        profile.
                      </p>
                    </div>
                  </div>
                  <span className="glass-pill text-xs">
                    {activeRentals.length} Active Issue(s)
                  </span>
                </div>

                {activeRentals.length === 0 ? (
                  <div className="liquid-well p-6 text-center space-y-2">
                    <p className="text-xs text-offwhite-300">
                      No books are currently issued under your profile.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('issue')}
                      className="glass-btn-accent px-4 py-1.5 text-xs inline-flex items-center gap-1.5 mt-1"
                    >
                      <BookPlus className="h-3.5 w-3.5" />
                      <span>Issue Books from Catalog</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeRentals.map((rental) => (
                      <div
                        key={rental.id}
                        className={`liquid-well p-4 rounded-2xl flex gap-3.5 items-start justify-between border ${
                          rental.is_overdue
                            ? 'border-wine-500/50 bg-wine-950/30'
                            : 'border-offwhite-100/10'
                        }`}
                      >
                        <div className="w-14 h-20 shrink-0 rounded-lg overflow-hidden border border-offwhite-100/15">
                          <BookCover
                            fileType={rental.book?.file_type || 'pdf'}
                            title={rental.book?.title || 'Book'}
                            author={rental.book?.author || ''}
                            coverUrl={rental.book?.cover_url ?? null}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <h4 className="font-serif text-sm font-bold text-offwhite-50 line-clamp-1">
                            {rental.book?.title || 'Unknown Title'}
                          </h4>
                          <p className="text-xs text-offwhite-300 truncate">
                            By {rental.book?.author || 'Department Library'}
                          </p>

                          <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-offwhite-100/[0.08]">
                            <div>
                              <span className="text-offwhite-400 block">
                                Issue Date:
                              </span>
                              <span className="font-mono text-offwhite-100 font-medium">
                                {formatDate(rental.issue_date)}
                              </span>
                            </div>
                            <div>
                              <span className="text-offwhite-400 block">
                                Due Date:
                              </span>
                              <span
                                className={`font-mono font-medium ${
                                  rental.is_overdue
                                    ? 'text-rose-300'
                                    : 'text-champagne-200'
                                }`}
                              >
                                {formatDate(rental.due_date)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                            <span
                              className={`glass-pill text-[10px] font-semibold ${
                                rental.is_overdue
                                  ? 'text-rose-300 border-rose-500/40 bg-rose-950/40'
                                  : rental.remaining_days <= 1
                                  ? 'text-champagne-200 border-champagne-300/40'
                                  : 'text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              {rental.is_overdue
                                ? `Overdue by ${rental.overdue_days} day(s)`
                                : `${rental.remaining_days} free days left`}
                            </span>

                            {rental.is_overdue && (
                              <span className="glass-pill text-[10px] text-rose-300 font-mono">
                                Fine: ₹{rental.calculated_fine.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Library Policy & Rules */}
          {activeTab === 'policy' && (
            <div className="liquid-glass p-6 sm:p-8 space-y-6">
              <div className="border-b border-offwhite-100/[0.1] pb-3">
                <h3 className="font-serif text-lg font-bold text-offwhite-50">
                  Professional Studies Department Library Borrowing Policy
                </h3>
                <p className="text-xs text-offwhite-300">
                  Dispur College, Guwahati, Assam — Official Student Borrowing
                  Guidelines
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="liquid-well p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Clock className="h-5 w-5" />
                    <span className="font-semibold text-sm">
                      {settings.borrowing_period_days}-Day Free Borrowing
                    </span>
                  </div>
                  <p className="text-xs text-offwhite-300 leading-relaxed">
                    Every student is granted a free{' '}
                    {settings.borrowing_period_days}-day borrowing period for
                    each issued book. No fees or charges apply if returned on or
                    before the due date.
                  </p>
                </div>

                <div className="liquid-well p-4 space-y-2">
                  <div className="flex items-center gap-2 text-champagne-300">
                    <ShieldAlert className="h-5 w-5" />
                    <span className="font-semibold text-sm">
                      Late Return Fine (₹{settings.daily_fine_rate}/Day)
                    </span>
                  </div>
                  <p className="text-xs text-offwhite-300 leading-relaxed">
                    If a book is kept beyond the free loan period, a fine of ₹
                    {settings.daily_fine_rate} per day is automatically applied
                    until the book is returned to the librarian.
                  </p>
                </div>

                <div className="liquid-well p-4 space-y-2">
                  <div className="flex items-center gap-2 text-rose-300">
                    <BookMarked className="h-5 w-5" />
                    <span className="font-semibold text-sm">
                      Max {settings.max_books_per_student} Books at a Time
                    </span>
                  </div>
                  <p className="text-xs text-offwhite-300 leading-relaxed">
                    Each student may borrow up to {settings.max_books_per_student}{' '}
                    books simultaneously. To borrow additional books, please
                    return previous loans.
                  </p>
                </div>
              </div>

              <div className="liquid-well p-4 text-xs text-offwhite-300/85 space-y-2">
                <h4 className="font-bold text-offwhite-100">
                  Physical Book Return Procedure:
                </h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Bring the physical book copy to the Department Library
                    counter.
                  </li>
                  <li>
                    Present your GU Registration Number or College Roll Number to
                    the librarian.
                  </li>
                  <li>
                    The librarian will inspect book condition and record the
                    return in the library management system.
                  </li>
                  <li>
                    Any applicable late fines must be cleared with the library
                    treasurer upon return.
                  </li>
                </ol>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
