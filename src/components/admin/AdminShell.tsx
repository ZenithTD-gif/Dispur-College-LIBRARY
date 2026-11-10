'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
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
import { DispurCollegeLogo } from '@/components/shared/DispurCollegeLogo';
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
    <div className="flex min-h-screen text-offwhite-100">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-charcoal-950/75 backdrop-blur-md lg:hidden"
        />
      )}

      {/* Frosted Mac Liquid Glass Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-offwhite-100/[0.11] bg-gradient-to-b from-charcoal-900/90 via-maroon-950/85 to-charcoal-950/90 text-offwhite-100 backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-300 ease-liquid lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-offwhite-100/[0.08] px-5">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <DispurCollegeLogo size="sm" />
            <div>
              <p className="font-serif text-sm font-bold text-offwhite-50 leading-tight group-hover:text-champagne-200 transition-colors">
                Admin Portal
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-200/90">
                Dispur College
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-full p-1.5 text-offwhite-300 hover:bg-offwhite-100/[0.1] hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-champagne-300/75">
            Library Management
          </p>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-liquid ${
                  item.active
                    ? 'border border-champagne-300/35 bg-gradient-to-r from-maroon-800/80 via-burgundy-700/75 to-wine-600/75 text-offwhite-50 shadow-[0_6px_18px_-4px_rgba(125,22,46,0.55),inset_0_1px_0_rgba(250,247,242,0.3)]'
                    : 'text-offwhite-200/85 hover:translate-x-1 hover:bg-offwhite-100/[0.08] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Identity Footer */}
        <div className="border-t border-offwhite-100/[0.08] p-4 space-y-3">
          <div className="liquid-well p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-offwhite-50">{admin.name}</p>
              <span className="shrink-0 rounded-full border border-champagne-300/30 bg-maroon-900/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-champagne-200">
                {ROLE_LABELS[admin.role]}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-offwhite-300/75">{admin.email}</p>
          </div>

          <div className="space-y-2">
            <Link
              href="/admin/update-password"
              onClick={() => setSidebarOpen(false)}
              className="glass-btn w-full py-2 text-xs"
            >
              <KeyRound className="h-3.5 w-3.5 text-champagne-300" />
              Change Password
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="glass-btn-danger w-full py-2 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-offwhite-100/[0.09] bg-charcoal-950/70 px-4 backdrop-blur-2xl backdrop-saturate-150 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-full border border-offwhite-100/20 bg-offwhite-100/[0.07] p-2 text-offwhite-100 hover:bg-offwhite-100/[0.14] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-champagne-300">
                Professional Studies Department
              </p>
              <p className="text-xs text-offwhite-300/75 hidden sm:block">
                Dispur College Digital Library Administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/library"
              target="_blank"
              className="glass-btn px-3.5 py-1.5 text-xs"
            >
              <span>Student Portal</span>
              <ExternalLink className="h-3.5 w-3.5 text-champagne-300" />
            </Link>
            <Link href="/admin/books/new" className="glass-btn-primary py-1.5 px-3.5 text-xs">
              <PlusCircle className="h-3.5 w-3.5 text-champagne-200" />
              <span className="hidden sm:inline">Quick Upload</span>
            </Link>
          </div>
        </header>

        <main className="animate-page-enter flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

