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
    <header className="sticky top-0 z-40 border-b border-white/[0.1] bg-abyss-950/65 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_12px_36px_-14px_rgba(2,6,23,0.8)]">
      {/* Subtle institutional top strip */}
      <div className="border-b border-white/[0.06] bg-white/[0.025] text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-[11px] sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5 text-amethyst-300 shrink-0" />
            <span className="font-medium tracking-wide text-slate-200">
              Dispur College, Guwahati, Assam, India
            </span>
          </div>
          <span className="hidden sm:inline text-slate-400">
            Department of Professional Studies — Academic Repository
          </span>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/library" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/25 bg-gradient-to-br from-blue-500/30 via-amethyst-500/25 to-burgundy-700/35 text-white shadow-[0_6px_18px_-4px_rgba(79,70,229,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl transition-all duration-300 ease-liquid group-hover:scale-105 group-hover:border-white/40">
            <BookMarked className="h-5 w-5 text-amethyst-300" />
          </div>
          <div>
            <p className="font-serif text-base font-bold text-white leading-tight sm:text-lg">
              Digital Library
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-300/90">
              Professional Studies Dept.
            </p>
          </div>
        </Link>

        {/* Desktop Glass Nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.04] p-1 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-liquid ${
                  item.active
                    ? 'border border-white/25 bg-white/[0.14] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
                    : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-2">
            <Link
              href="/admin"
              className="glass-btn px-3.5 py-2 text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-rose-300" />
              Admin Portal
            </Link>
          </div>
        </nav>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.07] p-2.5 text-slate-100 backdrop-blur-xl transition-all duration-200 hover:bg-white/[0.14] md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Glass Nav Drawer */}
      {mobileOpen && (
        <div className="border-t border-white/[0.1] bg-abyss-900/90 px-4 py-4 space-y-2 backdrop-blur-2xl md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                item.active
                  ? 'border border-white/20 bg-white/[0.14] text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
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
            <ShieldCheck className="h-4 w-4 text-rose-200" />
            Admin Portal
          </Link>
        </div>
      )}
    </header>
  );
}

