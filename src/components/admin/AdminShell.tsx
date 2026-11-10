'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookMarked,
  BookOpen,
  ExternalLink,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Users,
  X,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { ROLE_LABELS } from '@/lib/validation';
import type { AdminUser } from '@/types/library';

export function AdminShell({
  admin,
  children,
}: {
  admin: AdminUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const navLinks = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === '/admin',
    },
    {
      href: '/admin/books',
      label: 'Manage Books',
      icon: BookOpen,
      active: pathname === '/admin/books' || pathname.includes('/edit'),
    },
    {
      href: '/admin/books/new',
      label: 'Upload Book',
      icon: PlusCircle,
      active: pathname === '/admin/books/new',
    },
    {
      href: '/admin/categories',
      label: 'Categories',
      icon: FolderOpen,
      active: pathname.startsWith('/admin/categories'),
    },
    {
      href: '/admin/team',
      label: 'Administrators',
      icon: Users,
      active: pathname.startsWith('/admin/team'),
    },
  ];

  async function handleLogout() {
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore client errors and proceed to login
    }
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-ivory-200 text-navy-900">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-navy-900 text-ivory-100 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500 text-white shadow-sm">
              <BookMarked className="h-5 w-5" />
            </div>
            <div>
              <p className="font-serif text-sm font-bold text-white leading-tight">
                Admin Portal
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gold-300">
                Dispur College
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1 text-ivory-200 hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-ivory-200/50">
            Library Management
          </p>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-gold-500 text-white shadow-sm'
                    : 'text-ivory-200/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Identity Footer */}
        <div className="border-t border-white/10 p-4 space-y-3">
          <div className="rounded-lg bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-white">{admin.name}</p>
              <span className="shrink-0 rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-300">
                {ROLE_LABELS[admin.role]}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-ivory-200/65">{admin.email}</p>
          </div>

          <div className="space-y-2">
            <Link
              href="/admin/update-password"
              onClick={() => setSidebarOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-ivory-100 hover:bg-white/10 transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5 text-gold-300" />
              Change Password
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-ivory-100 hover:bg-red-500/20 hover:border-red-400/40 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-parchment-300 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-parchment-300 p-2 text-navy-900 hover:bg-parchment-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">
                Professional Studies Department
              </p>
              <p className="text-xs text-slate-500 hidden sm:block">
                Dispur College Digital Library Administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/library"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-parchment-400 bg-ivory-100 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-parchment-200 transition-colors"
            >
              <span>Student Portal</span>
              <ExternalLink className="h-3.5 w-3.5 text-gold-600" />
            </Link>
            <Link href="/admin/books/new" className="btn-primary py-1.5 px-3 text-xs">
              <PlusCircle className="h-3.5 w-3.5 text-gold-300" />
              <span className="hidden sm:inline">Quick Upload</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

