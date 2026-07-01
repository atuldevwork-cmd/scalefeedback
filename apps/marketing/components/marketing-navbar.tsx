'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { appUrl } from '@/lib/app-url';

interface MarketingNavbarProps {
  activePage?: 'home' | 'pricing' | 'contact';
}

export function MarketingNavbar({ activePage }: MarketingNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = (page?: string) =>
    `text-sm transition-colors ${
      activePage === page
        ? 'font-semibold text-[#111111]'
        : 'text-[#555555] hover:text-[#111111]'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">P</div>
          <span className="font-bold text-lg text-[#111111]">Pinmarks</span>
        </Link>

        {/* Nav links — centered, desktop only */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/#features" className={linkClass()}>Features</Link>
          <Link href="/#integrations" className={linkClass()}>Integrations</Link>
          <Link href="/about" className={linkClass()}>About Us</Link>
          <Link href="/pricing" className={linkClass('pricing')}>Pricing</Link>
          <Link href="/contact" className={linkClass('contact')}>Contact</Link>
        </div>

        {/* Right side — desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link href={appUrl('/login')} className="text-sm font-medium text-[#555555] hover:text-[#111111] transition-colors px-3 py-2">
            Login
          </Link>
          <Link href={appUrl('/signup')} className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors whitespace-nowrap">
            Start free trial
          </Link>
        </div>

        {/* Hamburger — mobile only */}
        <button
          className="md:hidden p-2 rounded-lg text-[#555555] hover:text-[#111111] hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 border-t border-gray-100 bg-white/95 backdrop-blur shadow-lg px-4 py-4 flex flex-col gap-4 z-50">
          <Link href="/#features" className="text-sm text-[#555555] hover:text-[#111111] transition-colors py-1" onClick={() => setMobileOpen(false)}>Features</Link>
          <Link href="/#integrations" className="text-sm text-[#555555] hover:text-[#111111] transition-colors py-1" onClick={() => setMobileOpen(false)}>Integrations</Link>
          <Link href="/about" className={`py-1 ${linkClass()}`} onClick={() => setMobileOpen(false)}>About Us</Link>
          <Link href="/pricing" className={`py-1 ${linkClass('pricing')}`} onClick={() => setMobileOpen(false)}>Pricing</Link>
          <Link href="/contact" className={`py-1 ${linkClass('contact')}`} onClick={() => setMobileOpen(false)}>Contact</Link>
          <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
            <Link href={appUrl('/login')} className="text-sm font-medium text-[#555555] hover:text-[#111111] transition-colors" onClick={() => setMobileOpen(false)}>
              Login
            </Link>
            <Link href={appUrl('/signup')} className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-colors text-center" onClick={() => setMobileOpen(false)}>
              Start free trial
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
