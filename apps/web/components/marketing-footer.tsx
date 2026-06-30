import Link from 'next/link';

const FOOTER_LINKS = {
  'Quick Links': [
    { label: 'Features', href: '/#features' },
    { label: 'Integrations', href: '/#integrations' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Free Trial', href: '/signup' },
    { label: 'Login', href: '/login' },
  ],
'Integrations': [
    { label: 'Slack', href: '/#integrations' },
    { label: 'Jira', href: '/#integrations' },
    { label: 'GitHub', href: '/#integrations' },
  ],
  'Company': [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Pricing', href: '/pricing' },
  ],
};


export function MarketingFooter() {
  return (
    <footer className="bg-[#F5F5F2] text-[#555555]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">P</div>
              <span className="font-bold text-[#111111] text-lg">Pinmarks</span>
            </Link>
            <p className="text-sm leading-relaxed text-[#555555]">
              Pin bugs on any live page. Auto-capture context. Fix faster.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="text-xs font-bold text-[#111111] uppercase tracking-[0.12em] mb-5">{heading}</p>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#555555] hover:text-[#111111] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-black/8">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#555555]" suppressHydrationWarning>
            © {new Date().getFullYear()} Pinmarks. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
