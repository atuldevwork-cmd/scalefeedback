import Link from 'next/link';

interface MarketingNavbarProps {
  activePage?: 'home' | 'pricing';
}

export function MarketingNavbar({ activePage }: MarketingNavbarProps) {
  const linkClass = (page?: string) =>
    `text-sm transition-colors ${
      activePage === page
        ? 'font-semibold text-[#300a46]'
        : 'text-slate-600 hover:text-[#300a46]'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-[#300a46] rounded-lg flex items-center justify-center font-bold text-white text-sm">SF</div>
          <span className="font-bold text-lg text-[#300a46]">ScaleFeedback</span>
        </Link>

        {/* Nav links — centered */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/#features" className={linkClass()}>Features</Link>
          <Link href="/#integrations" className={linkClass()}>Integrations</Link>
          <Link href="/#testimonials" className={linkClass()}>Customers</Link>
          <Link href="/pricing" className={linkClass('pricing')}>Pricing</Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-[#300a46] transition-colors px-3 py-2">
            Login
          </Link>
          <Link href="/signup" className="bg-[#ff724f] hover:bg-[#e8623f] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
            Start free trial
          </Link>
        </div>
      </div>
    </nav>
  );
}
