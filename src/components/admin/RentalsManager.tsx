'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookMarked,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Mail,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  User,
  X,
  XCircle,
} from 'lucide-react';
import type {
  BookRentalWithDetails,
  BookReturnReminder,
  LibrarySettings,
  RentalOverviewStats,
  Student,
} from '@/types/library';

interface BookItem {
  id: string;
  title: string;
  author: string;
  subject: string;
}

export function RentalsManager({
  initialRentals,
  initialStats,
  initialSettings,
  initialStudents,
  booksList,
}: {
  initialRentals: BookRentalWithDetails[];
  initialStats: RentalOverviewStats;
  initialSettings: LibrarySettings;
  initialStudents: (Student & { active_loans: number; total_loans: number; unpaid_fines: number })[];
  booksList: BookItem[];
}) {
  const [activeTab, setActiveTab] = useState<
    'active' | 'history' | 'students' | 'availability' | 'settings' | 'reminders'
  >('active');

  const [rentals, setRentals] = useState<BookRentalWithDetails[]>(initialRentals);
  const [stats, setStats] = useState<RentalOverviewStats>(initialStats);
  const [settings, setSettings] = useState<LibrarySettings>(initialSettings);
  const [students, setStudents] = useState(initialStudents);

  // Reminders State
  const [reminderLogs, setReminderLogs] = useState<BookReturnReminder[]>([]);
  const [reminderStats, setReminderStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
  });
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);
  const [reminderNotice, setReminderNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Search & Filters
  const [rentalSearch, setRentalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'overdue'>('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Modals state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedRentalForReturn, setSelectedRentalForReturn] = useState<BookRentalWithDetails | null>(null);
  const [studentProfileModalOpen, setStudentProfileModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentRentalsHistory, setStudentRentalsHistory] = useState<BookRentalWithDetails[]>([]);
  const [loadingStudentHistory, setLoadingStudentHistory] = useState(false);

  // Issue Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [borrowingDays, setBorrowingDays] = useState(settings.borrowing_period_days);
  const [issueNotes, setIssueNotes] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Return Form State
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [customFineAmount, setCustomFineAmount] = useState<number | ''>('');
  const [finePaid, setFinePaid] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Settings Form State
  const [editFineRate, setEditFineRate] = useState(settings.daily_fine_rate);
  const [editPeriodDays, setEditPeriodDays] = useState(settings.borrowing_period_days);
  const [editMaxBooks, setEditMaxBooks] = useState(settings.max_books_per_student);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Availability state
  const [availabilityList, setAvailabilityList] = useState<Array<{
    bookId: string;
    title: string;
    author: string;
    subject: string;
    isAvailable: boolean;
    activeLoan: {
      rentalId: string;
      studentName: string;
      registrationNumber: string;
      rollNumber: string;
      issueDate: string;
      dueDate: string;
      isOverdue: boolean;
    } | null;
  }>>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Reload data helper
  async function refreshData() {
    try {
      const res = await fetch('/api/admin/rentals', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRentals(data.rentals || []);
        setStats(data.stats || stats);
        setSettings(data.settings || settings);
      }

      const stRes = await fetch('/api/admin/students', { cache: 'no-store' });
      if (stRes.ok) {
        const data = await stRes.json();
        setStudents(data.students || []);
      }
    } catch {
      // Ignore
    }
  }

  // Load availability when tab selected
  useEffect(() => {
    if (activeTab === 'availability') {
      loadAvailability();
    } else if (activeTab === 'reminders') {
      loadReminderLogs();
    }
  }, [activeTab]);

  async function loadAvailability() {
    setLoadingAvailability(true);
    try {
      const res = await fetch('/api/admin/books/availability', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAvailabilityList(data.books || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingAvailability(false);
    }
  }

  async function loadReminderLogs() {
    setLoadingReminders(true);
    try {
      const res = await fetch('/api/admin/reminders?limit=100', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setReminderLogs(data.logs || []);
        if (data.stats) {
          setReminderStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load reminder logs:', err);
    } finally {
      setLoadingReminders(false);
    }
  }

  async function handleRunReminderCheck() {
    setTriggeringReminders(true);
    setReminderNotice(null);
    try {
      const res = await fetch('/api/admin/reminders', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setReminderNotice({
          type: 'success',
          message: data.message || 'Automated reminder scan completed.',
        });
        await loadReminderLogs();
      } else {
        setReminderNotice({
          type: 'error',
          message: data.error || 'Failed to complete reminder scan.',
        });
      }
    } catch (err) {
      setReminderNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error executing reminder check.',
      });
    } finally {
      setTriggeringReminders(false);
    }
  }

  function formatKolkataDateTime(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '-';
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) return String(dateInput);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d) + ' IST';
    } catch {
      return String(dateInput);
    }
  }

  // Open Return Modal
  function handleOpenReturnModal(rental: BookRentalWithDetails) {
    setSelectedRentalForReturn(rental);
    const todayStr = new Date().toISOString().split('T')[0];
    setReturnDate(todayStr);

    // Calculate preliminary overdue days
    const dueDate = new Date(rental.due_date);
    const returnDateTime = new Date();
    let calculatedFine = 0;
    if (returnDateTime.getTime() > dueDate.getTime()) {
      const diffDays = Math.ceil(
        (returnDateTime.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      calculatedFine = diffDays * settings.daily_fine_rate;
    }

    setCustomFineAmount(calculatedFine);
    setFinePaid(calculatedFine === 0);
    setReturnNotes('');
    setReturnError(null);
    setReturnModalOpen(true);
  }

  // Submit Book Issue
  async function handleIssueBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudentId || !selectedBookId) {
      setIssueError('Please select both a student and a book.');
      return;
    }

    setIssuing(true);
    setIssueError(null);

    try {
      const res = await fetch('/api/admin/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          bookId: selectedBookId,
          issueDate: new Date(issueDate).toISOString(),
          borrowingPeriodDays: Number(borrowingDays),
          notes: issueNotes.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setIssueError(result?.error || 'Failed to issue book.');
        setIssuing(false);
        return;
      }

      setIssueModalOpen(false);
      setSelectedStudentId('');
      setSelectedBookId('');
      setIssueNotes('');
      setIssuing(false);
      await refreshData();
    } catch (err) {
      setIssueError(
        err instanceof Error ? err.message : 'An error occurred while issuing the book.'
      );
      setIssuing(false);
    }
  }

  // Submit Book Return
  async function handleConfirmReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRentalForReturn) return;

    setReturning(true);
    setReturnError(null);

    try {
      const fineVal =
        customFineAmount === '' ? undefined : Number(customFineAmount);

      const res = await fetch(
        `/api/admin/rentals/${selectedRentalForReturn.id}/return`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rentalId: selectedRentalForReturn.id,
            returnDate: new Date(returnDate).toISOString(),
            fineAmount: fineVal,
            finePaid,
            notes: returnNotes.trim() || undefined,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        setReturnError(result?.error || 'Failed to record return.');
        setReturning(false);
        return;
      }

      setReturnModalOpen(false);
      setSelectedRentalForReturn(null);
      setReturning(false);
      await refreshData();
    } catch (err) {
      setReturnError(
        err instanceof Error ? err.message : 'An error occurred while recording return.'
      );
      setReturning(false);
    }
  }

  // Mark Fine as Paid / Collected
  async function handleToggleFinePaid(rentalId: string, currentlyPaid: boolean) {
    try {
      const res = await fetch(`/api/admin/rentals/${rentalId}/fine`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentalId,
          finePaid: !currentlyPaid,
        }),
      });

      if (res.ok) {
        await refreshData();
      }
    } catch {
      // Ignore
    }
  }

  // View Student Profile & History
  async function handleViewStudent(std: Student) {
    setSelectedStudent(std);
    setStudentProfileModalOpen(true);
    setLoadingStudentHistory(true);

    try {
      const res = await fetch(`/api/admin/students/${std.id}`);
      if (res.ok) {
        const data = await res.json();
        setStudentRentalsHistory([
          ...(data.activeRentals || []),
          ...(data.historyRentals || []),
        ]);
      }
    } catch {
      setStudentRentalsHistory([]);
    } finally {
      setLoadingStudentHistory(false);
    }
  }

  // Toggle student active status
  async function handleToggleStudentStatus(studentId: string, currentStatus: boolean) {
    try {
      const res = await fetch('/api/admin/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          isActive: !currentStatus,
        }),
      });

      if (res.ok) {
        await refreshData();
        if (selectedStudent && selectedStudent.id === studentId) {
          setSelectedStudent((prev) => (prev ? { ...prev, is_active: !currentStatus } : null));
        }
      }
    } catch {
      // Ignore
    }
  }

  // Save Settings
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(null);
    setSettingsError(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyFineRate: Number(editFineRate),
          borrowingPeriodDays: Number(editPeriodDays),
          maxBooksPerStudent: Number(editMaxBooks),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSettingsError(data?.error || 'Failed to update settings.');
        setSavingSettings(false);
        return;
      }

      setSettings(data.settings);
      setSettingsSuccess('Library rental settings updated successfully!');
      setSavingSettings(false);
      await refreshData();
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : 'An error occurred while saving.'
      );
      setSavingSettings(false);
    }
  }

  // Filtered rentals
  const filteredRentals = rentals.filter((r) => {
    // Status tab filter
    if (activeTab === 'active') {
      if (r.status !== 'issued') return false;
      if (statusFilter === 'overdue' && !r.is_overdue) return false;
    } else if (activeTab === 'history') {
      if (r.status !== 'returned') return false;
    }

    if (!rentalSearch) return true;
    const term = rentalSearch.toLowerCase();
    const matchBook =
      r.book?.title?.toLowerCase().includes(term) ||
      r.book?.author?.toLowerCase().includes(term);
    const matchStudent =
      r.student?.full_name?.toLowerCase().includes(term) ||
      r.student?.registration_number?.toLowerCase().includes(term) ||
      r.student?.college_roll_number?.toLowerCase().includes(term);

    return matchBook || matchStudent;
  });

  // Filtered students
  const filteredStudents = students.filter((s) => {
    if (deptFilter !== 'all' && s.department !== deptFilter) return false;
    if (!studentSearch) return true;
    const term = studentSearch.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(term) ||
      s.registration_number?.toLowerCase().includes(term) ||
      s.college_roll_number?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term)
    );
  });

  // Distinct departments for filter
  const departmentsList = Array.from(new Set(students.map((s) => s.department).filter(Boolean)));

  // Calculate return preview due difference
  function calculateReturnPreviewFine() {
    if (!selectedRentalForReturn) return 0;
    const dueDate = new Date(selectedRentalForReturn.due_date);
    const retDate = new Date(returnDate);
    if (retDate.getTime() > dueDate.getTime()) {
      const diffDays = Math.ceil(
        (retDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays * settings.daily_fine_rate;
    }
    return 0;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="glass-pill border-champagne-300/35 bg-maroon-900/60 px-3 py-0.5 text-xs font-semibold text-champagne-200">
              Department Operations
            </span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold text-offwhite-50 sm:text-3xl">
            Student & Book Rental Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-offwhite-300">
            Issue books, record returns, track 7-day free borrowing periods, calculate late fines, and manage registered students.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={refreshData}
            className="glass-btn px-3 py-2 text-xs"
            title="Refresh Data"
          >
            <RefreshCw className="h-3.5 w-3.5 text-champagne-300" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIssueError(null);
              setIssueModalOpen(true);
            }}
            className="glass-btn-primary px-4 py-2 text-xs"
          >
            <PlusCircle className="h-4 w-4 text-champagne-200" />
            <span>Issue Book to Student</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="liquid-glass p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-offwhite-300">
            Active Issues
          </span>
          <p className="font-mono text-2xl font-bold text-offwhite-50">
            {stats.activeRentals}
          </p>
          <span className="text-[11px] text-offwhite-400">Currently with students</span>
        </div>

        <div
          className={`liquid-glass p-4 space-y-1 ${
            stats.overdueRentals > 0
              ? 'border-wine-500/50 bg-gradient-to-br from-wine-950/40 to-charcoal-900/60'
              : ''
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-offwhite-300">
            Overdue Loans
          </span>
          <p
            className={`font-mono text-2xl font-bold ${
              stats.overdueRentals > 0 ? 'text-rose-300' : 'text-offwhite-50'
            }`}
          >
            {stats.overdueRentals}
          </p>
          <span className="text-[11px] text-rose-300/80">Past 7-day free period</span>
        </div>

        <div className="liquid-glass p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-offwhite-300">
            Returned Books
          </span>
          <p className="font-mono text-2xl font-bold text-emerald-300">
            {stats.returnedRentals}
          </p>
          <span className="text-[11px] text-offwhite-400">Total returned loans</span>
        </div>

        <div className="liquid-glass p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-offwhite-300">
            Registered Students
          </span>
          <p className="font-mono text-2xl font-bold text-champagne-200">
            {stats.totalStudents}
          </p>
          <span className="text-[11px] text-offwhite-400">Active student accounts</span>
        </div>

        <div className="liquid-glass p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-offwhite-300">
            Outstanding Fines
          </span>
          <p className="font-mono text-2xl font-bold text-champagne-100">
            ₹{stats.totalOutstandingFines.toFixed(2)}
          </p>
          <span className="text-[11px] text-champagne-300/80">
            Rate: ₹{settings.daily_fine_rate}/day
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
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
          Active Issues ({stats.activeRentals})
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
          Return History ({stats.returnedRentals})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
            activeTab === 'students'
              ? 'border border-champagne-300/40 bg-gradient-to-r from-maroon-800/80 to-burgundy-700/75 text-offwhite-50 shadow-card'
              : 'text-offwhite-300 hover:bg-offwhite-100/[0.08] hover:text-white'
          }`}
        >
          Registered Students ({students.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
            activeTab === 'availability'
              ? 'border border-champagne-300/40 bg-gradient-to-r from-maroon-800/80 to-burgundy-700/75 text-offwhite-50 shadow-card'
              : 'text-offwhite-300 hover:bg-offwhite-100/[0.08] hover:text-white'
          }`}
        >
          Book Availability Monitor
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
            activeTab === 'settings'
              ? 'border border-champagne-300/40 bg-gradient-to-r from-maroon-800/80 to-burgundy-700/75 text-offwhite-50 shadow-card'
              : 'text-offwhite-300 hover:bg-offwhite-100/[0.08] hover:text-white'
          }`}
        >
          Settings & Fine Rate
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${
            activeTab === 'reminders'
              ? 'border border-champagne-300/40 bg-gradient-to-r from-maroon-800/80 to-burgundy-700/75 text-offwhite-50 shadow-card'
              : 'text-offwhite-300 hover:bg-offwhite-100/[0.08] hover:text-white'
          }`}
        >
          <Mail className="h-3.5 w-3.5 text-champagne-300" />
          <span>Return Reminders</span>
          {reminderStats.failed > 0 && (
            <span className="ml-1 rounded-full bg-rose-500/80 px-1.5 py-0.2 text-[10px] text-white">
              {reminderStats.failed}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Active Issued Books */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-offwhite-400" />
              <input
                type="text"
                value={rentalSearch}
                onChange={(e) => setRentalSearch(e.target.value)}
                placeholder="Search by book or student..."
                className="liquid-input pl-9 text-xs py-2"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`glass-pill px-3 py-1 text-xs ${
                  statusFilter === 'all'
                    ? 'border-champagne-300/40 bg-maroon-900/70 text-champagne-200'
                    : 'text-offwhite-300'
                }`}
              >
                All Active ({stats.activeRentals})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('overdue')}
                className={`glass-pill px-3 py-1 text-xs ${
                  statusFilter === 'overdue'
                    ? 'border-wine-400/50 bg-wine-700/40 text-rose-200'
                    : 'text-offwhite-300'
                }`}
              >
                Overdue Only ({stats.overdueRentals})
              </button>
            </div>
          </div>

          {filteredRentals.length === 0 ? (
            <div className="liquid-panel py-12 text-center space-y-3">
              <BookMarked className="mx-auto h-8 w-8 text-offwhite-400/60" />
              <p className="text-sm font-semibold text-offwhite-100">
                No active book issues found
              </p>
              <p className="text-xs text-offwhite-400 max-w-sm mx-auto">
                Issue a book to a registered student to start tracking their 7-day free borrowing period.
              </p>
              <button
                type="button"
                onClick={() => setIssueModalOpen(true)}
                className="glass-btn-primary px-4 py-2 text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Issue First Book</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto liquid-glass">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-offwhite-100/[0.08] bg-charcoal-900/50 text-offwhite-300 font-semibold">
                    <th className="py-3 px-4">Book</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Free Period / Overdue</th>
                    <th className="py-3 px-4">Current Fine</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-offwhite-100/[0.06]">
                  {filteredRentals.map((r) => {
                    const issueStr = new Date(r.issue_date).toLocaleDateString('en-IN');
                    const dueStr = new Date(r.due_date).toLocaleDateString('en-IN');

                    return (
                      <tr key={r.id} className="hover:bg-offwhite-100/[0.03]">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-offwhite-100 line-clamp-1 max-w-xs">
                            {r.book?.title || 'Unknown Book'}
                          </div>
                          <span className="text-[11px] text-offwhite-400 truncate block">
                            By {r.book?.author || 'Unknown'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              if (r.student) handleViewStudent(r.student as Student);
                            }}
                            className="font-medium text-champagne-300 hover:underline text-left block"
                          >
                            {r.student?.full_name || 'Student'}
                          </button>
                          <span className="text-[10px] text-offwhite-400 block font-mono">
                            Roll: {r.student?.college_roll_number} | GU: {r.student?.registration_number}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-offwhite-300">{issueStr}</td>
                        <td className="py-3 px-4 text-offwhite-200 font-semibold">{dueStr}</td>

                        <td className="py-3 px-4">
                          {r.is_overdue ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-wine-400/50 bg-wine-700/30 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                              <AlertCircle className="h-3 w-3" />
                              <span>Overdue ({r.overdue_days}d)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-900/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                              <Clock className="h-3 w-3" />
                              <span>{r.remaining_days}d left</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold">
                          {r.calculated_fine > 0 ? (
                            <span className="text-rose-300">
                              ₹{r.calculated_fine.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-emerald-300 font-normal">₹0.00 (Free)</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenReturnModal(r)}
                            className="glass-btn-accent px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Record Return</span>
                          </button>
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

      {/* TAB 2: Return History & Fines */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-offwhite-400" />
            <input
              type="text"
              value={rentalSearch}
              onChange={(e) => setRentalSearch(e.target.value)}
              placeholder="Search history by book or student..."
              className="liquid-input pl-9 text-xs py-2"
            />
          </div>

          <div className="overflow-x-auto liquid-glass">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-offwhite-100/[0.08] bg-charcoal-900/50 text-offwhite-300 font-semibold">
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Issued On</th>
                  <th className="py-3 px-4">Returned On</th>
                  <th className="py-3 px-4">Overdue Days</th>
                  <th className="py-3 px-4">Fine Amount</th>
                  <th className="py-3 px-4">Fine Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-offwhite-100/[0.06]">
                {filteredRentals.map((r) => {
                  const issueStr = new Date(r.issue_date).toLocaleDateString('en-IN');
                  const returnStr = r.return_date
                    ? new Date(r.return_date).toLocaleDateString('en-IN')
                    : '—';

                  return (
                    <tr key={r.id} className="hover:bg-offwhite-100/[0.03]">
                      <td className="py-3 px-4 font-semibold text-offwhite-100 max-w-xs truncate">
                        {r.book?.title || 'Book Title'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-offwhite-200">
                          {r.student?.full_name || 'Student'}
                        </span>
                        <span className="text-[10px] text-offwhite-400 block font-mono">
                          Roll: {r.student?.college_roll_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-offwhite-300">{issueStr}</td>
                      <td className="py-3 px-4 text-emerald-300 font-medium">{returnStr}</td>
                      <td className="py-3 px-4 font-mono text-offwhite-200">
                        {r.overdue_days > 0 ? `${r.overdue_days} days` : '0 (On Time)'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-offwhite-100">
                        ₹{Number(r.fine_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {Number(r.fine_amount || 0) === 0 ? (
                          <span className="text-emerald-400 font-semibold text-[11px]">
                            Free Loan
                          </span>
                        ) : r.fine_paid ? (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            Paid / Settled
                          </span>
                        ) : (
                          <span className="rounded-full bg-wine-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {Number(r.fine_amount || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => handleToggleFinePaid(r.id, r.fine_paid)}
                            className={`glass-btn px-2.5 py-1 text-[11px] ${
                              r.fine_paid
                                ? 'text-offwhite-300 hover:text-rose-200'
                                : 'text-emerald-300 hover:text-emerald-200'
                            }`}
                          >
                            {r.fine_paid ? 'Mark Unpaid' : 'Mark Fine Paid'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Registered Students */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-offwhite-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students by name, roll, reg no..."
                className="liquid-input pl-9 text-xs py-2"
              />
            </div>

            {departmentsList.length > 0 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="liquid-input text-xs py-2 w-full sm:w-60 appearance-none cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departmentsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="overflow-x-auto liquid-glass">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-offwhite-100/[0.08] bg-charcoal-900/50 text-offwhite-300 font-semibold">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">GU Reg. No.</th>
                  <th className="py-3 px-4">College Roll No.</th>
                  <th className="py-3 px-4">Department & Semester</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Active / Total Loans</th>
                  <th className="py-3 px-4">Unpaid Fines</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-offwhite-100/[0.06]">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-offwhite-100/[0.03]">
                    <td className="py-3 px-4 font-semibold text-offwhite-100">
                      {s.full_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-champagne-300">
                      {s.registration_number}
                    </td>
                    <td className="py-3 px-4 font-mono text-offwhite-200">
                      {s.college_roll_number}
                    </td>
                    <td className="py-3 px-4 text-offwhite-300">
                      <div>{s.department}</div>
                      <span className="text-[10px] text-offwhite-400">{s.semester}</span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-offwhite-300">
                      <div>{s.email}</div>
                      <span className="text-offwhite-400 font-mono">{s.phone}</span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-champagne-200">{s.active_loans}</span>
                      <span className="text-offwhite-400"> / {s.total_loans}</span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {s.unpaid_fines > 0 ? (
                        <span className="text-rose-300 font-bold">
                          ₹{s.unpaid_fines.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-emerald-300">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {s.is_active ? (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewStudent(s)}
                          className="glass-btn px-2.5 py-1 text-xs"
                          title="View student profile & history"
                        >
                          <Eye className="h-3 w-3 text-champagne-300" />
                          <span>Profile</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStudentStatus(s.id, s.is_active)}
                          className={`glass-btn px-2.5 py-1 text-xs ${
                            s.is_active ? 'text-rose-300' : 'text-emerald-300'
                          }`}
                          title={s.is_active ? 'Deactivate account' : 'Activate account'}
                        >
                          {s.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Book Availability Monitor */}
      {activeTab === 'availability' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-sm font-bold text-offwhite-50">
                Department Book Stock & Availability Status
              </h3>
              <p className="text-xs text-offwhite-300">
                Live status of physical books in the department library.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAvailability}
              className="glass-btn px-3 py-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 text-champagne-300" />
              <span>Refresh Status</span>
            </button>
          </div>

          {loadingAvailability ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-champagne-300" />
              <p className="mt-2 text-xs text-offwhite-300">Checking book availability...</p>
            </div>
          ) : (
            <div className="overflow-x-auto liquid-glass">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-offwhite-100/[0.08] bg-charcoal-900/50 text-offwhite-300 font-semibold">
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4">Issued To</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-offwhite-100/[0.06]">
                  {availabilityList.map((item) => (
                    <tr key={item.bookId} className="hover:bg-offwhite-100/[0.03]">
                      <td className="py-3 px-4 font-semibold text-offwhite-100 max-w-xs truncate">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 text-offwhite-300">{item.author}</td>
                      <td className="py-3 px-4 text-offwhite-400">{item.subject}</td>
                      <td className="py-3 px-4">
                        {item.isAvailable ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                            <Check className="h-3 w-3" />
                            <span>Available</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-wine-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                            <Clock className="h-3 w-3" />
                            <span>Currently Issued</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.activeLoan ? (
                          <div>
                            <span className="font-medium text-offwhite-100">
                              {item.activeLoan.studentName}
                            </span>
                            <span className="text-[10px] text-offwhite-400 block font-mono">
                              Roll: {item.activeLoan.rollNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-offwhite-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.activeLoan ? (
                          <span
                            className={
                              item.activeLoan.isOverdue
                                ? 'text-rose-300 font-semibold'
                                : 'text-offwhite-200'
                            }
                          >
                            {new Date(item.activeLoan.dueDate).toLocaleDateString('en-IN')}
                            {item.activeLoan.isOverdue && ' (Overdue)'}
                          </span>
                        ) : (
                          <span className="text-offwhite-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.isAvailable ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookId(item.bookId);
                              setIssueError(null);
                              setIssueModalOpen(true);
                            }}
                            className="glass-btn-accent px-3 py-1.5 text-xs"
                          >
                            <PlusCircle className="h-3 w-3" />
                            <span>Issue This</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const found = rentals.find(
                                (r) => r.id === item.activeLoan?.rentalId
                              );
                              if (found) handleOpenReturnModal(found);
                            }}
                            className="glass-btn px-3 py-1.5 text-xs"
                          >
                            <span>Return</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Settings & Fine Rate */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl liquid-glass p-6 sm:p-8 space-y-6">
          <div className="border-b border-offwhite-100/[0.1] pb-3">
            <h3 className="font-serif text-lg font-bold text-offwhite-50">
              Department Rental Policy & Late Fine Settings
            </h3>
            <p className="text-xs text-offwhite-300">
              Configure fine per overdue day, free borrowing days, and book quotas. These settings dynamically apply to all student accounts.
            </p>
          </div>

          {settingsSuccess && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-500/40 bg-emerald-900/25 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5 backdrop-blur-xl"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <p className="leading-relaxed">{settingsSuccess}</p>
            </div>
          )}

          {settingsError && (
            <div
              role="alert"
              className="rounded-2xl border border-wine-400/45 bg-wine-700/20 p-3.5 text-xs text-rose-200 flex items-start gap-2.5 backdrop-blur-xl"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-300 mt-0.5" />
              <p className="leading-relaxed">{settingsError}</p>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label
                htmlFor="fine-rate"
                className="block text-xs font-semibold text-offwhite-200 mb-1"
              >
                Daily Late Fine Rate (₹ per day overdue)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-champagne-300">
                  ₹
                </span>
                <input
                  id="fine-rate"
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={editFineRate}
                  onChange={(e) => setEditFineRate(parseFloat(e.target.value) || 0)}
                  className="liquid-input pl-9 text-sm font-mono"
                  disabled={savingSettings}
                />
              </div>
              <span className="text-[11px] text-offwhite-400 mt-1 block">
                Applied automatically for each day after the free 7-day borrowing period ends. Example: ₹5 per day.
              </span>
            </div>

            <div>
              <label
                htmlFor="borrowing-period"
                className="block text-xs font-semibold text-offwhite-200 mb-1"
              >
                Free Borrowing Period (Days)
              </label>
              <input
                id="borrowing-period"
                type="number"
                min="1"
                max="90"
                required
                value={editPeriodDays}
                onChange={(e) => setEditPeriodDays(parseInt(e.target.value) || 7)}
                className="liquid-input text-sm font-mono"
                disabled={savingSettings}
              />
              <span className="text-[11px] text-offwhite-400 mt-1 block">
                Standard department free borrowing period (Default is 7 days).
              </span>
            </div>

            <div>
              <label
                htmlFor="max-books"
                className="block text-xs font-semibold text-offwhite-200 mb-1"
              >
                Maximum Books per Student
              </label>
              <input
                id="max-books"
                type="number"
                min="1"
                max="20"
                required
                value={editMaxBooks}
                onChange={(e) => setEditMaxBooks(parseInt(e.target.value) || 3)}
                className="liquid-input text-sm font-mono"
                disabled={savingSettings}
              />
              <span className="text-[11px] text-offwhite-400 mt-1 block">
                Maximum active book loans permitted simultaneously per student account (Default is 3).
              </span>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="glass-btn-primary px-6 py-2.5 text-xs font-semibold"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <span>Save Rental Policy Settings</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 6: Automated Book Return Reminders */}
      {/* ======================================================================= */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          {/* Header & Action Bar */}
          <div className="liquid-panel p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-offwhite-100/[0.1] pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-offwhite-50 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-champagne-300" />
                  <span>Email Notifications & Return Reminders</span>
                </h3>
                <p className="text-xs text-offwhite-400 mt-1">
                  Automatic Book Issue Confirmations (System A) and 24-Hour Return Warnings (System B) powered by Resend Email API and Supabase Cron.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadReminderLogs}
                  disabled={loadingReminders}
                  className="glass-btn-secondary px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
                  title="Refresh logs from database"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingReminders ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunReminderCheck}
                  disabled={triggeringReminders}
                  className="glass-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                >
                  {triggeringReminders ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Scanning Issues...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 text-champagne-300" />
                      <span>Run Reminder Check Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notification Alert */}
            {reminderNotice && (
              <div
                role="alert"
                className={`rounded-2xl border p-4 text-xs backdrop-blur-xl flex items-start gap-2 ${
                  reminderNotice.type === 'success'
                    ? 'border-emerald-400/45 bg-emerald-700/20 text-emerald-200'
                    : 'border-wine-400/45 bg-wine-700/20 text-rose-200'
                }`}
              >
                {reminderNotice.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-300 mt-0.5" />
                )}
                <p className="leading-relaxed">{reminderNotice.message}</p>
              </div>
            )}

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-xl border border-offwhite-100/[0.08] bg-charcoal-900/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-offwhite-400 font-medium">Total Logged</div>
                <div className="font-serif text-xl font-bold text-offwhite-50 mt-1">{reminderStats.total}</div>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-medium">Delivered (Sent)</div>
                <div className="font-serif text-xl font-bold text-emerald-200 mt-1">{reminderStats.sent}</div>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3">
                <div className="text-[11px] uppercase tracking-wider text-rose-300 font-medium">Failed</div>
                <div className="font-serif text-xl font-bold text-rose-200 mt-1">{reminderStats.failed}</div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3">
                <div className="text-[11px] uppercase tracking-wider text-amber-300 font-medium">Skipped (Idempotent)</div>
                <div className="font-serif text-xl font-bold text-amber-200 mt-1">{reminderStats.skipped}</div>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="liquid-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-sm font-bold text-offwhite-50">
                Recent Email Notification Audit Trail
              </h4>
              <span className="text-[11px] text-offwhite-400">
                Timezone: Asia/Kolkata (IST)
              </span>
            </div>

            {loadingReminders && reminderLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-offwhite-400 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-champagne-300" />
                <p className="text-xs">Loading reminder audit trail...</p>
              </div>
            ) : reminderLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-offwhite-100/[0.15] p-8 text-center text-offwhite-400 space-y-2">
                <Mail className="h-8 w-8 mx-auto text-offwhite-500" />
                <p className="text-xs font-medium">No reminder records logged yet.</p>
                <p className="text-[11px] text-offwhite-500 max-w-md mx-auto">
                  Click &ldquo;Run Reminder Check Now&rdquo; to scan active borrowing issues and dispatch 24-hour advance notices.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-offwhite-100/[0.1] bg-charcoal-900/40">
                <table className="w-full text-left text-xs text-offwhite-200">
                  <thead className="border-b border-offwhite-100/[0.1] bg-charcoal-900/80 text-[11px] uppercase tracking-wider text-offwhite-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Student & Recipient</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Book Title</th>
                      <th className="px-4 py-3 font-semibold">Return Due Date</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Sent At (IST)</th>
                      <th className="px-4 py-3 font-semibold">Delivery Reference / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-offwhite-100/[0.06]">
                    {reminderLogs.map((log) => {
                      const isSent = log.status === 'sent';
                      const isFailed = log.status === 'failed';
                      const isSkipped = log.status === 'skipped';
                      const isIssueConfirmation = log.reminder_type === 'BOOK_ISSUE_CONFIRMATION';

                      return (
                        <tr key={log.id} className="hover:bg-offwhite-100/[0.03] transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-offwhite-50">{log.student_name}</div>
                            <div className="text-[11px] text-offwhite-400">{log.recipient_email}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isIssueConfirmation ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/40 bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-purple-200">
                                <span>Issue Confirmation</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200">
                                <span>24h Return Warning</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-offwhite-100 max-w-xs truncate">
                            {log.book_title}
                          </td>
                          <td className="px-4 py-3 font-medium text-rose-300">
                            {formatKolkataDateTime(log.due_date)}
                          </td>
                          <td className="px-4 py-3">
                            {isSent && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Sent</span>
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-rose-200">
                                <XCircle className="h-3 w-3" />
                                <span>Failed {log.retry_count > 0 ? `(${log.retry_count})` : ''}</span>
                              </span>
                            )}
                            {isSkipped && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200">
                                <Clock className="h-3 w-3" />
                                <span>Skipped</span>
                              </span>
                            )}
                            {!isSent && !isFailed && !isSkipped && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-sky-200">
                                <span>Pending</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-offwhite-300">
                            {log.sent_at ? formatKolkataDateTime(log.sent_at) : '-'}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-offwhite-400 max-w-xs">
                            {isSent && log.email_id ? (
                              <span className="font-mono text-[10px] text-emerald-300/80">
                                ID: {log.email_id}
                              </span>
                            ) : isFailed && log.last_error ? (
                              <div className="space-y-1">
                                <span className="text-rose-300/90 block truncate" title={log.last_error}>
                                  {log.last_error}
                                </span>
                                {(log.metadata?.isSandboxRestricted || log.last_error.includes('testing emails to your own email address')) && (
                                  <span className="inline-block text-[9px] text-amber-300/90 bg-amber-950/40 border border-amber-600/30 px-1.5 py-0.5 rounded">
                                    Resend Sandbox restriction
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-offwhite-500">-</span>
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
        </div>
      )}


      {/* ======================================================================= */}
      {/* MODAL 1: Issue Book to Student */}
      {/* ======================================================================= */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-md">
          <div className="liquid-panel w-full max-w-lg p-6 space-y-4 animate-modal-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-offwhite-100/[0.1] pb-3">
              <div className="flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-champagne-300" />
                <h3 className="font-serif text-base font-bold text-offwhite-50">
                  Issue Book to Student
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="rounded-full p-1 text-offwhite-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {issueError && (
              <div
                role="alert"
                className="rounded-2xl border border-wine-400/45 bg-wine-700/20 p-3 text-xs text-rose-200 flex items-start gap-2 backdrop-blur-xl"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-300 mt-0.5" />
                <p className="leading-relaxed">{issueError}</p>
              </div>
            )}

            <form onSubmit={handleIssueBook} className="space-y-4">
              {/* Select Student */}
              <div>
                <label
                  htmlFor="issue-student"
                  className="block text-xs font-semibold text-offwhite-200 mb-1"
                >
                  Select Registered Student <span className="text-rose-300">*</span>
                </label>
                <select
                  id="issue-student"
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="liquid-input text-xs appearance-none cursor-pointer"
                  disabled={issuing}
                >
                  <option value="">-- Choose Student (by Name / Roll No) --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.college_roll_number} | {s.registration_number}) - {s.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Book */}
              <div>
                <label
                  htmlFor="issue-book"
                  className="block text-xs font-semibold text-offwhite-200 mb-1"
                >
                  Select Book <span className="text-rose-300">*</span>
                </label>
                <select
                  id="issue-book"
                  required
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="liquid-input text-xs appearance-none cursor-pointer"
                  disabled={issuing}
                >
                  <option value="">-- Choose Book from Library Catalog --</option>
                  {booksList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} (by {b.author}) - {b.subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue Date & Borrowing Days */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="issue-date"
                    className="block text-xs font-semibold text-offwhite-200 mb-1"
                  >
                    Issue Date
                  </label>
                  <input
                    id="issue-date"
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="liquid-input text-xs"
                    disabled={issuing}
                  />
                </div>

                <div>
                  <label
                    htmlFor="issue-days"
                    className="block text-xs font-semibold text-offwhite-200 mb-1"
                  >
                    Free Period (Days)
                  </label>
                  <input
                    id="issue-days"
                    type="number"
                    min="1"
                    max="60"
                    value={borrowingDays}
                    onChange={(e) => setBorrowingDays(parseInt(e.target.value) || 7)}
                    className="liquid-input text-xs font-mono"
                    disabled={issuing}
                  />
                </div>
              </div>

              {/* Calculated Due Date Display */}
              <div className="liquid-well p-3 text-xs space-y-1">
                <div className="flex items-center justify-between text-offwhite-300">
                  <span>Calculated Due Date:</span>
                  <span className="font-semibold text-champagne-200">
                    {new Date(
                      new Date(issueDate).getTime() +
                        borrowingDays * 24 * 60 * 60 * 1000
                    ).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-[10px] text-offwhite-400">
                  * 7-day free policy: Student can hold the book for {borrowingDays} days without any charges. Late fee of ₹{settings.daily_fine_rate}/day applies thereafter.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="issue-notes"
                  className="block text-xs font-semibold text-offwhite-200 mb-1"
                >
                  Issue Notes (Optional)
                </label>
                <input
                  id="issue-notes"
                  type="text"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="e.g. Clean copy, book copy #1"
                  className="liquid-input text-xs"
                  disabled={issuing}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="glass-btn px-4 py-2 text-xs"
                  disabled={issuing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuing}
                  className="glass-btn-primary px-5 py-2 text-xs"
                >
                  {issuing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Issuing Book...</span>
                    </>
                  ) : (
                    <span>Confirm Book Issue</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2: Record Book Return */}
      {/* ======================================================================= */}
      {returnModalOpen && selectedRentalForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-md">
          <div className="liquid-panel w-full max-w-lg p-6 space-y-4 animate-modal-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-offwhite-100/[0.1] pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-champagne-300" />
                <h3 className="font-serif text-base font-bold text-offwhite-50">
                  Record Book Return
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="rounded-full p-1 text-offwhite-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {returnError && (
              <div
                role="alert"
                className="rounded-2xl border border-wine-400/45 bg-wine-700/20 p-3 text-xs text-rose-200 flex items-start gap-2 backdrop-blur-xl"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-300 mt-0.5" />
                <p className="leading-relaxed">{returnError}</p>
              </div>
            )}

            {/* Book & Student Info Box */}
            <div className="liquid-well p-3.5 space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-offwhite-400 block">
                  Book Title
                </span>
                <p className="font-bold text-offwhite-100 text-sm">
                  {selectedRentalForReturn.book?.title}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-offwhite-100/[0.08] pt-2">
                <div>
                  <span className="text-offwhite-400 block">Borrower</span>
                  <span className="font-semibold text-offwhite-200">
                    {selectedRentalForReturn.student?.full_name}
                  </span>
                  <span className="text-[10px] text-offwhite-400 block font-mono">
                    Roll: {selectedRentalForReturn.student?.college_roll_number}
                  </span>
                </div>
                <div>
                  <span className="text-offwhite-400 block">Due Date (7-Day Free)</span>
                  <span className="font-semibold text-champagne-200">
                    {new Date(selectedRentalForReturn.due_date).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmReturn} className="space-y-4">
              <div>
                <label
                  htmlFor="return-date"
                  className="block text-xs font-semibold text-offwhite-200 mb-1"
                >
                  Actual Return Date
                </label>
                <input
                  id="return-date"
                  type="date"
                  required
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="liquid-input text-xs"
                  disabled={returning}
                />
              </div>

              {/* Automatic Overdue & Fine Calculation Preview */}
              <div className="liquid-well p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-offwhite-300">Overdue Days Calculated:</span>
                  <span
                    className={`font-mono font-bold ${
                      calculateReturnPreviewFine() > 0 ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {calculateReturnPreviewFine() > 0
                      ? `${Math.round(calculateReturnPreviewFine() / settings.daily_fine_rate)} day(s) late`
                      : '0 (Returned on time)'}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-offwhite-100/[0.08] pt-2">
                  <span className="text-offwhite-300">
                    Late Fine Rate (₹{settings.daily_fine_rate}/day):
                  </span>
                  <span className="font-mono font-bold text-champagne-200">
                    ₹{calculateReturnPreviewFine().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Fine Override & Paid Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label
                    htmlFor="return-fine-amount"
                    className="block text-xs font-semibold text-offwhite-200 mb-1"
                  >
                    Final Fine Amount (₹)
                  </label>
                  <input
                    id="return-fine-amount"
                    type="number"
                    min="0"
                    step="0.5"
                    value={customFineAmount}
                    onChange={(e) =>
                      setCustomFineAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="liquid-input text-xs font-mono"
                    disabled={returning}
                  />
                  <span className="text-[10px] text-offwhite-400 mt-0.5 block">
                    (Editable to waive or adjust)
                  </span>
                </div>

                <div className="flex items-center gap-2 p-2 liquid-well">
                  <input
                    id="return-fine-paid"
                    type="checkbox"
                    checked={finePaid}
                    onChange={(e) => setFinePaid(e.target.checked)}
                    className="h-4 w-4 rounded border-offwhite-100/20 bg-charcoal-900 text-maroon-600 focus:ring-champagne-300 cursor-pointer"
                    disabled={returning}
                  />
                  <label
                    htmlFor="return-fine-paid"
                    className="text-xs font-medium text-offwhite-100 cursor-pointer"
                  >
                    Fine Collected / Paid
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="return-notes"
                  className="block text-xs font-semibold text-offwhite-200 mb-1"
                >
                  Return Notes (Optional)
                </label>
                <input
                  id="return-notes"
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Good condition, pages intact"
                  className="liquid-input text-xs"
                  disabled={returning}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="glass-btn px-4 py-2 text-xs"
                  disabled={returning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returning}
                  className="glass-btn-accent px-5 py-2 text-xs"
                >
                  {returning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Recording Return...</span>
                    </>
                  ) : (
                    <span>Confirm Book Return</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 3: View Student Profile & Full Borrowing History */}
      {/* ======================================================================= */}
      {studentProfileModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-md">
          <div className="liquid-panel w-full max-w-2xl p-6 space-y-5 animate-modal-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-offwhite-100/[0.1] pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-champagne-300" />
                <h3 className="font-serif text-base font-bold text-offwhite-50">
                  Student Profile & Borrowing Dossier
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStudentProfileModalOpen(false)}
                className="rounded-full p-1 text-offwhite-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Student Details Card */}
            <div className="liquid-well p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-base font-bold text-offwhite-50">
                    {selectedStudent.full_name}
                  </h4>
                  <p className="text-offwhite-300">
                    {selectedStudent.department} • {selectedStudent.semester}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    selectedStudent.is_active
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {selectedStudent.is_active ? 'Active Account' : 'Deactivated'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-offwhite-100/[0.08] text-[11px]">
                <div>
                  <span className="text-offwhite-400 block">College Roll No.</span>
                  <span className="font-mono font-bold text-champagne-200">
                    {selectedStudent.college_roll_number}
                  </span>
                </div>
                <div>
                  <span className="text-offwhite-400 block">GU Reg. No.</span>
                  <span className="font-mono font-bold text-champagne-200">
                    {selectedStudent.registration_number}
                  </span>
                </div>
                <div>
                  <span className="text-offwhite-400 block">Email Address</span>
                  <span className="text-offwhite-200 truncate block">
                    {selectedStudent.email}
                  </span>
                </div>
                <div>
                  <span className="text-offwhite-400 block">Mobile Phone</span>
                  <span className="font-mono text-offwhite-200">
                    {selectedStudent.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* Borrowing History Section */}
            <div className="space-y-2">
              <h4 className="font-serif text-sm font-bold text-offwhite-50">
                Complete Borrowing & Rental Records
              </h4>

              {loadingStudentHistory ? (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-champagne-300" />
                  <p className="mt-1 text-xs text-offwhite-300">Loading student history...</p>
                </div>
              ) : studentRentalsHistory.length === 0 ? (
                <div className="py-6 text-center text-xs text-offwhite-400 liquid-well">
                  This student has not borrowed any books yet.
                </div>
              ) : (
                <div className="overflow-x-auto liquid-well">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-offwhite-100/[0.08] bg-charcoal-900/40 text-offwhite-300 font-semibold">
                        <th className="py-2.5 px-3">Book</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Issue Date</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3">Return Date</th>
                        <th className="py-2.5 px-3">Fine</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-offwhite-100/[0.06]">
                      {studentRentalsHistory.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 px-3 font-medium text-offwhite-100">
                            {r.book?.title || 'Book Title'}
                          </td>
                          <td className="py-2.5 px-3">
                            {r.status === 'issued' ? (
                              r.is_overdue ? (
                                <span className="text-rose-300 font-semibold text-[10px]">
                                  Overdue
                                </span>
                              ) : (
                                <span className="text-emerald-300 font-semibold text-[10px]">
                                  Active Loan
                                </span>
                              )
                            ) : (
                              <span className="text-offwhite-400 text-[10px]">Returned</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-offwhite-300">
                            {new Date(r.issue_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-offwhite-300">
                            {new Date(r.due_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-offwhite-300">
                            {r.return_date
                              ? new Date(r.return_date).toLocaleDateString('en-IN')
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {r.calculated_fine > 0 ? (
                              <span className="text-rose-300">
                                ₹{r.calculated_fine.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-emerald-300">₹0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-offwhite-100/[0.08] pt-3">
              <button
                type="button"
                onClick={() =>
                  handleToggleStudentStatus(selectedStudent.id, selectedStudent.is_active)
                }
                className={`glass-btn px-3 py-1.5 text-xs ${
                  selectedStudent.is_active ? 'text-rose-300' : 'text-emerald-300'
                }`}
              >
                {selectedStudent.is_active ? 'Deactivate Student Account' : 'Reactivate Student Account'}
              </button>

              <button
                type="button"
                onClick={() => setStudentProfileModalOpen(false)}
                className="glass-btn-accent px-4 py-1.5 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
