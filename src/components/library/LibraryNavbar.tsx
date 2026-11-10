'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Menu, ShieldCheck, X } from 'lucide-react';
import { DispurCollegeLogo } from '@/components/shared/DispurCollegeLogo';

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
    <header className="sticky top-0 z-40 border-b border-offwhite-100/[0.11] bg-charcoal-950/70 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_12px_36px_-14px_rgba(10,5,7,0.85)]">
      {/* Subtle institutional top strip */}
      <div className="border-b border-offwhite-100/[0.07] bg-gradient-to-r from-maroon-950/60 via-charcoal-900/40 to-burgundy-900/50 text-offwhite-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-[11px] sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5 text-champagne-300 shrink-0" />
            <span className="font-medium tracking-wide text-offwhite-100">
              Dispur College, Guwahati, Assam, India
            </span>
          </div>
          <span className="hidden sm:inline text-offwhite-300/80">
            Department of Professional Studies — Academic Repository
          </span>
        </div>
      </div>

      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/library" className="flex items-center gap-3 group">
          <DispurCollegeLogo size="md" />
          <div>
            <p className="font-serif text-base font-bold text-offwhite-50 leading-tight sm:text-lg transition-colors group-hover:text-champagne-200">
              Digital Library
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-200/90">
              Professional Studies Dept.
            </p>
          </div>
        </Link>

        {/* Desktop Glass Nav */}
        <nav className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-offwhite-100/[0.12] bg-offwhite-100/[0.045] p-1 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(250,247,242,0.12)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-liquid ${
                  item.active
                    ? 'border border-champagne-300/35 bg-gradient-to-r from-maroon-800/80 via-burgundy-700/75 to-wine-600/75 text-offwhite-50 font-semibold shadow-[inset_0_1px_0_rgba(250,247,242,0.3)]'
                    : 'text-offwhite-300 hover:bg-offwhite-100/[0.08] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-1.5">
            <Link href="/admin" className="glass-btn px-3.5 py-2 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-champagne-300" />
              Admin Portal
            </Link>
          </div>
        </nav>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-full border border-offwhite-100/20 bg-offwhite-100/[0.07] p-2.5 text-offwhite-100 backdrop-blur-xl transition-all duration-200 hover:bg-offwhite-100/[0.14] active:scale-95 md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Glass Nav Drawer */}
      {mobileOpen && (
        <div className="animate-page-enter border-t border-offwhite-100/[0.1] bg-charcoal-950/90 px-4 py-4 space-y-2 backdrop-blur-2xl md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                item.active
                  ? 'border border-champagne-300/30 bg-gradient-to-r from-maroon-800/80 to-burgundy-700/75 text-white font-semibold'
                  : 'text-offwhite-200 hover:bg-offwhite-100/[0.08] hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="glass-btn-accent mt-2 flex w-full justify-center py-2.5 text-sm"
          >
            <ShieldCheck className="h-4 w-4 text-champagne-200" />
            Admin Portal
          </Link>
        </div>
      )}
    </header>
  );
}

