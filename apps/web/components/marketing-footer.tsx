import Link from 'next/link';

const FOOTER_LINKS = {
  'Quick Links': [
    { label: 'Features', href: '/#features' },
    { label: 'Integrations', href: '/#integrations' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Free Trial', href: '/signup' },
    { label: 'Login', href: '/login' },
  ],
  'Resources': [
    { label: 'Help & Support', href: '/contact' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Security', href: '/security' },
    { label: 'Changelog', href: '/changelog' },
  ],
  'Integrations': [
    { label: 'Jira', href: '/#integrations' },
    { label: 'GitHub', href: '/#integrations' },
    { label: 'Trello', href: '/#integrations' },
    { label: 'ClickUp', href: '/#integrations' },
    { label: 'Slack', href: '/#integrations' },
    { label: 'Linear', href: '/#integrations' },
    { label: 'See All', href: '/#integrations' },
  ],
  'Company': [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
  ],
};

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.252 5.622 5.913-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-[#F5F5F2] text-[#555555]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">P</div>
              <span className="font-bold text-[#111111] text-lg">Pinmarks</span>
            </Link>
            <p className="text-sm leading-relaxed text-[#555555] mb-6">
              Collect, annotate and fix website bugs — faster than ever.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              {[
                { icon: <IconX />, href: '#', label: 'X / Twitter' },
                { icon: <IconLinkedIn />, href: '#', label: 'LinkedIn' },
                { icon: <IconYouTube />, href: '#', label: 'YouTube' },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-xl bg-[#111111]/5 hover:bg-[#ff724f] hover:text-white text-[#555555] flex items-center justify-center transition-all"
                >
                  {s.icon}
                </a>
              ))}
            </div>
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
          <div className="flex items-center gap-5">
            <Link href="/terms" className="text-xs text-[#555555] hover:text-[#111111] transition-colors">Terms</Link>
            <Link href="/privacy" className="text-xs text-[#555555] hover:text-[#111111] transition-colors">Privacy</Link>
            <Link href="/security" className="text-xs text-[#555555] hover:text-[#111111] transition-colors">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
