'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  History,
  KeyRound,
  Library,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldAlert,
  User,
} from 'lucide-react';
import { BookCover } from '@/components/shared/BookCover';
import { DispurCollegeLogo } from '@/components/shared/DispurCollegeLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type {
  BookRentalWithDetails,
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
}: {
  initialStudent: Student;
  initialActiveRentals: BookRentalWithDetails[];
  initialHistoryRentals: BookRentalWithDetails[];
  initialSettings: LibrarySettings;
  initialTotalFine: number;
  initialOverdueCount: number;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'profile' | 'policy'>('active');

  const [student, setStudent] = useState<Student>(initialStudent);
  const [activeRentals, setActiveRentals] = useState<BookRentalWithDetails[]>(initialActiveRentals);
  const [historyRentals, setHistoryRentals] = useState<BookRentalWithDetails[]>(initialHistoryRentals);
  const [settings] = useState<LibrarySettings>(initialSettings);
  const [totalFine, setTotalFine] = useState<number>(initialTotalFine);
  const [overdueCount, setOverdueCount] = useState<number>(initialOverdueCount);

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
      }
    } catch {
      // Ignore
    }
  }

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
      // Proceed
    }
    router.push('/student/login');
    router.refresh();
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          department: editDepartment.trim(),
          semester: editSemester.trim(),
          phone: editPhone.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setProfileError(data?.error || 'Failed to update profile.');
        setSavingProfile(false);
        return;
      }

      setStudent(data.student);
      setProfileSuccess('Profile updated successfully!');
      setSavingProfile(false);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'An error occurred while updating.'
      );
      setSavingProfile(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col text-offwhite-100">
      {/* Top Institutional Header */}
      <header className="sticky top-0 z-40 border-b border-offwhite-100/[0.1] bg-charcoal-950/80 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/library" className="flex items-center gap-3 group">
            <DispurCollegeLogo size="sm" />
            <div>
              <p className="font-serif text-sm font-bold text-offwhite-50 leading-tight group-hover:text-champagne-200 transition-colors sm:text-base">
                Dispur College Digital Library
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-200/90">
                Student Portal
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={refreshStudentDashboard}
              className="glass-btn px-3 py-1.5 text-xs"
              title="Refresh Dashboard"
            >
              <RefreshCw className="h-3.5 w-3.5 text-champagne-300" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/library/browse"
              className="glass-btn hidden sm:inline-flex px-3.5 py-1.5 text-xs"
            >
              <BookOpen className="h-3.5 w-3.5 text-champagne-300" />
              <span>Browse Catalog</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="glass-btn-danger px-3 py-1.5 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{signingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 animate-page-enter mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Student Welcome Banner */}
        <section className="liquid-panel p-6 sm:p-8 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-maroon-700/25 blur-3xl" />
          <div className="pointer-events-none absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-champagne-400/10 blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="glass-pill border-champagne-300/35 bg-maroon-900/60 px-3 py-1 text-xs font-semibold text-champagne-200">
                  <GraduationCap className="h-3.5 w-3.5 text-champagne-300" />
                  <span>Student ID: {student.college_roll_number}</span>
                </span>
                <span className="glass-pill border-offwhite-100/15 bg-charcoal-900/60 px-2.5 py-1 text-xs text-offwhite-300 font-mono">
                  GU Reg: {student.registration_number}
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-offwhite-50">
                Welcome, {student.full_name}
              </h1>

              <p className="text-xs sm:text-sm text-offwhite-300 max-w-2xl leading-relaxed">
                {student.department} • {student.semester} • Dispur College
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="glass-btn px-4 py-2 text-xs"
              >
                <User className="h-3.5 w-3.5 text-champagne-300" />
                <span>My Profile</span>
              </button>
              <Link
                href="/library/browse"
                className="glass-btn-accent px-4 py-2 text-xs"
              >
                <Library className="h-3.5 w-3.5 text-champagne-100" />
                <span>Search Books</span>
              </Link>
            </div>
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
                7 Days
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
                  ? 'Books past the 7-day free return deadline'
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
                      You do not have any physical books borrowed from the department library right now.
                      You can borrow up to {settings.max_books_per_student} books for 7 days free of charge!
                    </p>
                  </div>
                  <Link href="/library/browse" className="glass-btn-accent inline-flex px-5 py-2 text-xs">
                    <BookOpen className="h-3.5 w-3.5 text-champagne-100" />
                    <span>Browse Department Books</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeRentals.map((rental) => {
                    const issueDateStr = new Date(rental.issue_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    const dueDateStr = new Date(rental.due_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={rental.id}
                        className={`liquid-glass p-5 flex flex-col justify-between space-y-4 ${
                          rental.is_overdue
                            ? 'border-wine-500/50 bg-gradient-to-br from-wine-950/40 via-charcoal-900/60 to-charcoal-950/70'
                            : ''
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className="w-20 h-28 shrink-0 overflow-hidden rounded-xl border border-champagne-300/20 shadow-card">
                            <BookCover
                              title={rental.book?.title || 'Book'}
                              author={rental.book?.author || ''}
                              fileType={rental.book?.file_type || 'pdf'}
                              subject={rental.book?.subject || ''}
                              coverUrl={rental.book?.cover_url ?? null}
                              className="h-full w-full"
                            />
                          </div>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <span className="glass-pill text-[10px] text-champagne-300 font-medium">
                              {rental.book?.subject || 'Reference Book'}
                            </span>
                            <h3 className="font-serif text-base font-bold text-offwhite-50 leading-snug line-clamp-2">
                              {rental.book?.title || 'Unknown Title'}
                            </h3>
                            <p className="text-xs text-offwhite-300 truncate">
                              By {rental.book?.author || 'Unknown Author'}
                            </p>

                            {/* Free Days / Overdue Status Pill */}
                            <div className="pt-1">
                              {rental.is_overdue ? (
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-wine-400/50 bg-wine-700/30 px-3 py-1 text-xs font-semibold text-rose-200">
                                  <AlertCircle className="h-3.5 w-3.5 text-rose-300" />
                                  <span>Overdue by {rental.overdue_days} day(s)</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-200">
                                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                                  <span>
                                    {rental.remaining_days === 0
                                      ? 'Due Today!'
                                      : `${rental.remaining_days} free days remaining`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Rental Tracking Details Box */}
                        <div className="liquid-well p-3 space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-offwhite-400 block">Issue Date</span>
                              <span className="font-semibold text-offwhite-100">{issueDateStr}</span>
                            </div>
                            <div>
                              <span className="text-offwhite-400 block">Due Date (7-Day Free)</span>
                              <span
                                className={`font-semibold ${
                                  rental.is_overdue ? 'text-rose-300' : 'text-champagne-200'
                                }`}
                              >
                                {dueDateStr}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-offwhite-100/[0.08] pt-2 flex items-center justify-between text-[11px]">
                            <span className="text-offwhite-400">Current Late Fee</span>
                            <span
                              className={`font-mono font-bold ${
                                rental.is_overdue ? 'text-rose-300 text-sm' : 'text-emerald-300'
                              }`}
                            >
                              ₹{rental.calculated_fine.toFixed(2)}
                            </span>
                          </div>

                          {rental.is_overdue && (
                            <p className="text-[10px] text-rose-200/80 leading-tight pt-1">
                              * Late fee is calculated at ₹{settings.daily_fine_rate} per day overdue after the 7-day free borrowing period.
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        {rental.book && (
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Link
                              href={`/library/books/${rental.book.id}`}
                              className="glass-btn px-3 py-1.5 text-xs"
                            >
                              <span>Book Details</span>
                              <ExternalLink className="h-3 w-3 text-champagne-300" />
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Borrowing History */}
          {activeTab === 'history' && (
            <div className="liquid-glass overflow-hidden">
              <div className="p-4 border-b border-offwhite-100/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-sm font-bold text-offwhite-50">
                    Previous Borrowing & Return History
                  </h3>
                  <p className="text-xs text-offwhite-400">
                    Record of all books previously borrowed and returned by you.
                  </p>
                </div>
                <span className="glass-pill text-[10px] text-offwhite-300">
                  Total: {historyRentals.length}
                </span>
              </div>

              {historyRentals.length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <History className="mx-auto h-8 w-8 text-offwhite-400/60" />
                  <p className="text-xs text-offwhite-300">
                    No previous borrowing history recorded yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-offwhite-100/[0.08] bg-charcoal-900/40 text-offwhite-300 font-semibold">
                        <th className="py-3 px-4">Book Title</th>
                        <th className="py-3 px-4">Issued On</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Returned On</th>
                        <th className="py-3 px-4">Overdue Days</th>
                        <th className="py-3 px-4">Fine Amount</th>
                        <th className="py-3 px-4">Fine Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-offwhite-100/[0.06]">
                      {historyRentals.map((r) => {
                        const issueStr = new Date(r.issue_date).toLocaleDateString('en-IN');
                        const dueStr = new Date(r.due_date).toLocaleDateString('en-IN');
                        const returnStr = r.return_date
                          ? new Date(r.return_date).toLocaleDateString('en-IN')
                          : '—';

                        return (
                          <tr key={r.id} className="hover:bg-offwhite-100/[0.03]">
                            <td className="py-3 px-4 font-medium text-offwhite-100 max-w-xs truncate">
                              {r.book?.title || 'Book Title'}
                            </td>
                            <td className="py-3 px-4 text-offwhite-300">{issueStr}</td>
                            <td className="py-3 px-4 text-offwhite-300">{dueStr}</td>
                            <td className="py-3 px-4 text-emerald-300 font-medium">{returnStr}</td>
                            <td className="py-3 px-4 font-mono text-offwhite-200">
                              {r.overdue_days > 0 ? `${r.overdue_days} days` : '0 (On Time)'}
                            </td>
                            <td className="py-3 px-4 font-mono text-offwhite-100 font-semibold">
                              ₹{Number(r.fine_amount || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              {Number(r.fine_amount || 0) === 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>No Fine</span>
                                </span>
                              ) : r.fine_paid ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-wine-500/25 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                                  Unpaid Fine
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Student Profile & Settings */}
          {activeTab === 'profile' && (
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
                        View and update permitted personal and departmental details.
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
                          onChange={(e) => setEditDepartment(e.target.value)}
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
                    You can change your password at any time. Ensure your new password is at least 6 characters long.
                  </p>

                  <Link
                    href="/student/update-password"
                    className="glass-btn w-full justify-center py-2 text-xs"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-champagne-300" />
                    <span>Change Account Password</span>
                  </Link>

                  <div className="liquid-well p-3 text-[11px] text-offwhite-400 space-y-1">
                    <p className="font-semibold text-offwhite-200">Account Security Note</p>
                    <p>
                      Never share your student credentials with other students. You are personally responsible for books borrowed under your registration number.
                    </p>
                  </div>
                </div>
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
                  Dispur College, Guwahati, Assam — Official Student Borrowing Guidelines
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="liquid-well p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Clock className="h-5 w-5" />
                    <span className="font-semibold text-sm">7-Day Free Borrowing</span>
                  </div>
                  <p className="text-xs text-offwhite-300 leading-relaxed">
                    Every student is granted a free 7-day borrowing period for each issued book. No fees or charges apply if returned on or before the due date.
                  </p>
                </div>

                <div className="liquid-well p-4 space-y-2">
                  <div className="flex items-center gap-2 text-champagne-300">
                    <ShieldAlert className="h-5 w-5" />
                    <span className="font-semibold text-sm">Late Return Fine (₹{settings.daily_fine_rate}/Day)</span>
                  </div>
                  <p className="text-xs text-offwhite-300 leading-relaxed">
                    If a book is kept beyond the 7-day period, a fine of ₹{settings.daily_fine_rate} per day is automatically applied until the book is returned to the librarian.
                  </p>
                </div>

                <div className="liquid-well p-4 space-y-2">
                  <div className="flex items-center gap-2 text-rose-300">
                    <BookMarked className="h-5 w-5" />
                    <span className="font-semibold text-sm">Max {settings.max_books_per_student} Books at a Time</span>
                  </div>
                  <p className="text-xs text-offwhite-300 leading-relaxed">
                    Each student may borrow up to {settings.max_books_per_student} books simultaneously. To borrow additional books, please return previous loans.
                  </p>
                </div>
              </div>

              <div className="liquid-well p-4 text-xs text-offwhite-300/85 space-y-2">
                <h4 className="font-bold text-offwhite-100">Physical Book Return Procedure:</h4>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Return books directly to the Department Library desk during college working hours.</li>
                  <li>The librarian will inspect the book and record the return in the system.</li>
                  <li>Any accrued late fees must be cleared at the library desk.</li>
                  <li>Digital e-books and PDFs on the portal remain accessible online 24/7.</li>
                </ul>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
