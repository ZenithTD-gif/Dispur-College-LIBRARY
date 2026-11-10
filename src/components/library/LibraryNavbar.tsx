'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookMarked, GraduationCap, Menu, ShieldCheck, X } from 'lucide-react';

export function LibraryNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: '/library', label: 'Home', active: pathname === '/library' },
    {
      href: '/library/browse',
      label: 'Browse Catalog',
      active: pathname.startsWith('/library/browse') || pathname.startsWith('/library/books'),
    },
    { href: '/library#categories', label: 'Categories', active: false },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-parchment-300 bg-ivory-50/95 backdrop-blur-md">
      {/* Subtle institutional top bar */}
      <div className="bg-navy-900 text-ivory-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5 text-gold-400 shrink-0" />
            <span className="font-medium tracking-wide">
              Dispur College, Guwahati, Assam, India
            </span>
          </div>
          <span className="hidden sm:inline text-ivory-200/75">
            Department of Professional Studies — Academic Repository
          </span>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/library" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-400 shadow-sm transition-transform group-hover:scale-105">
            <BookMarked className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif text-base font-bold text-navy-900 leading-tight sm:text-lg">
              Digital Library
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-gold-600">
              Professional Studies Dept.
            </p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-parchment-200 text-navy-900 font-semibold'
                  : 'text-slate-600 hover:bg-parchment-100 hover:text-navy-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-3 pl-3 border-l border-parchment-300">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-parchment-400 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 shadow-sm transition-colors hover:border-navy-400 hover:bg-navy-50"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-gold-600" />
              Admin Portal
            </Link>
          </div>
        </nav>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-lg border border-parchment-300 p-2 text-navy-900 md:hidden hover:bg-parchment-100"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="border-t border-parchment-300 bg-ivory-50 px-4 py-3 space-y-1 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                item.active
                  ? 'bg-parchment-200 text-navy-900 font-semibold'
                  : 'text-slate-700 hover:bg-parchment-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="mt-2 flex items-center gap-2 rounded-lg border border-parchment-400 bg-white px-3 py-2 text-sm font-semibold text-navy-900"
          >
            <ShieldCheck className="h-4 w-4 text-gold-600" />
            Admin Portal
          </Link>
        </div>
      )}
    </header>
  );
}

