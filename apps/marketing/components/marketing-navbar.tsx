'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Menu, X, ChevronDown, MessageSquarePlus, PenTool,
  PlayCircle, Sparkles, ScanSearch, Workflow,
} from 'lucide-react';
import { appUrl } from '@/lib/app-url';

interface MarketingNavbarProps {
  activePage?: 'home' | 'about' | 'pricing' | 'contact';
}

const FEATURE_ITEMS = [
  { href: '/#features', icon: MessageSquarePlus, title: 'Widget', description: 'Capture bugs & feedback in one click' },
  { href: '/#features', icon: PenTool, title: 'Annotate & Screenshot', description: 'Draw, blur, and mark up screenshots' },
  { href: '/#features', icon: PlayCircle, title: 'Session Replay', description: 'Watch what led up to the bug' },
  { href: '/#features', icon: Sparkles, title: 'AI Features', description: 'Magic Rewrite, titles & translation' },
  { href: '/#features', icon: ScanSearch, title: 'AI Website Scanner', description: 'Automated UX, CRO & accessibility audits' },
  { href: '/#integrations', icon: Workflow, title: 'Integrations', description: 'GitHub, Jira, ClickUp & Slack sync' },
];

const INTEGRATION_COLUMNS: { category: string; items: { name: string; color: string }[] }[][] = [
  [
    { category: 'Project Management', items: [
      { name: 'Trello', color: '#0079BF' },
      { name: 'Asana', color: '#FC636B' },
      { name: 'ClickUp', color: '#7B68EE' },
      { name: 'Teamwork', color: '#0EA5A5' },
      { name: 'Basecamp', color: '#1D2D35' },
      { name: 'Notion', color: '#111111' },
      { name: 'Wrike', color: '#4CB749' },
      { name: 'Monday.com', color: '#FF3D57' },
      { name: 'Shortcut', color: '#5C5FFA' },
    ] },
    { category: 'CMS Plugins', items: [
      { name: 'WordPress', color: '#21759B' },
    ] },
  ],
  [
    { category: 'Issue Tracker', items: [
      { name: 'Jira', color: '#0052CC' },
      { name: 'GitHub', color: '#171515' },
      { name: 'GitLab', color: '#FC6D26' },
      { name: 'Azure DevOps', color: '#0078D4' },
      { name: 'Linear', color: '#5E6AD2' },
      { name: 'Bitbucket', color: '#2684FF' },
    ] },
    { category: 'Other', items: [
      { name: 'Intercom', color: '#286EFA' },
      { name: 'Zendesk', color: '#03363D' },
      { name: 'LogRocket', color: '#764ABC' },
      { name: 'FullStory', color: '#F55065' },
      { name: 'BrowserStack', color: '#FF5C35' },
      { name: 'Slack', color: '#4A154B' },
    ] },
  ],
];

function IntegrationBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {name.charAt(0)}
    </span>
  );
}

export function MarketingNavbar({ activePage }: MarketingNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [mobileIntegrationsOpen, setMobileIntegrationsOpen] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const integrationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!featuresOpen && !integrationsOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (featuresRef.current && !featuresRef.current.contains(e.target as Node)) {
        setFeaturesOpen(false);
      }
      if (integrationsRef.current && !integrationsRef.current.contains(e.target as Node)) {
        setIntegrationsOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFeaturesOpen(false); setIntegrationsOpen(false); }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [featuresOpen, integrationsOpen]);

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
          <div
            ref={featuresRef}
            className="relative"
            onMouseEnter={() => setFeaturesOpen(true)}
            onMouseLeave={() => setFeaturesOpen(false)}
          >
            <button
              type="button"
              onClick={() => setFeaturesOpen((v) => !v)}
              aria-expanded={featuresOpen}
              className={`flex items-center gap-1 ${linkClass('features')}`}
            >
              Features
              <ChevronDown size={15} className={`transition-transform duration-200 ${featuresOpen ? 'rotate-180' : ''}`} />
            </button>

            {featuresOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[560px]">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-3 grid grid-cols-2 gap-1">
                  {FEATURE_ITEMS.map(({ href, icon: Icon, title, description }) => (
                    <Link
                      key={title}
                      href={href}
                      onClick={() => setFeaturesOpen(false)}
                      className="flex items-start gap-3 rounded-xl p-3 hover:bg-[#fff3f0] transition-colors group"
                    >
                      <span className="shrink-0 w-9 h-9 rounded-lg bg-[#fff3f0] text-[#ff724f] flex items-center justify-center group-hover:bg-[#ff724f] group-hover:text-white transition-colors">
                        <Icon size={17} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-[#111111]">{title}</span>
                        <span className="block text-xs text-[#777777] mt-0.5 leading-snug">{description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div
            ref={integrationsRef}
            className="relative"
            onMouseEnter={() => setIntegrationsOpen(true)}
            onMouseLeave={() => setIntegrationsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIntegrationsOpen((v) => !v)}
              aria-expanded={integrationsOpen}
              className={`flex items-center gap-1 ${linkClass('integrations')}`}
            >
              Integrations
              <ChevronDown size={15} className={`transition-transform duration-200 ${integrationsOpen ? 'rotate-180' : ''}`} />
            </button>

            {integrationsOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[520px]">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-5">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    {INTEGRATION_COLUMNS.map((column, colIdx) => (
                      <div key={colIdx} className="flex flex-col gap-5">
                        {column.map(({ category, items }) => (
                          <div key={category}>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#999999] mb-2">{category}</p>
                            <div className="flex flex-col gap-2">
                              {items.map(({ name, color }) => (
                                <Link
                                  key={name}
                                  href="/#integrations"
                                  onClick={() => setIntegrationsOpen(false)}
                                  className="flex items-center gap-2.5 text-sm text-[#333333] hover:text-[#111111] rounded-md px-1.5 py-1 -mx-1.5 hover:bg-[#fff3f0] transition-colors"
                                >
                                  <IntegrationBadge name={name} color={color} />
                                  {name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <Link
                      href="/#integrations"
                      onClick={() => setIntegrationsOpen(false)}
                      className="text-sm font-semibold text-[#ff724f] hover:text-[#e8603a] transition-colors"
                    >
                      View all integrations →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Link href="/about" className={linkClass('about')}>About Us</Link>
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
          <div>
            <button
              type="button"
              onClick={() => setMobileFeaturesOpen((v) => !v)}
              className="w-full flex items-center justify-between text-sm text-[#555555] hover:text-[#111111] transition-colors py-1"
            >
              Features
              <ChevronDown size={15} className={`transition-transform duration-200 ${mobileFeaturesOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileFeaturesOpen && (
              <div className="mt-1 pl-3 flex flex-col gap-3 border-l border-gray-100">
                {FEATURE_ITEMS.map(({ href, icon: Icon, title, description }) => (
                  <Link
                    key={title}
                    href={href}
                    onClick={() => { setMobileOpen(false); setMobileFeaturesOpen(false); }}
                    className="flex items-start gap-2.5"
                  >
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-[#fff3f0] text-[#ff724f] flex items-center justify-center mt-0.5">
                      <Icon size={14} />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-[#111111]">{title}</span>
                      <span className="block text-xs text-[#777777] leading-snug">{description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => setMobileIntegrationsOpen((v) => !v)}
              className="w-full flex items-center justify-between text-sm text-[#555555] hover:text-[#111111] transition-colors py-1"
            >
              Integrations
              <ChevronDown size={15} className={`transition-transform duration-200 ${mobileIntegrationsOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileIntegrationsOpen && (
              <div className="mt-1 pl-3 flex flex-col gap-4 border-l border-gray-100">
                {INTEGRATION_COLUMNS.flat().map(({ category, items }) => (
                  <div key={category}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#999999] mb-1.5">{category}</p>
                    <div className="flex flex-col gap-2">
                      {items.map(({ name, color }) => (
                        <Link
                          key={name}
                          href="/#integrations"
                          onClick={() => { setMobileOpen(false); setMobileIntegrationsOpen(false); }}
                          className="flex items-center gap-2.5 text-sm text-[#333333]"
                        >
                          <IntegrationBadge name={name} color={color} />
                          {name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <Link
                  href="/#integrations"
                  onClick={() => { setMobileOpen(false); setMobileIntegrationsOpen(false); }}
                  className="text-sm font-semibold text-[#ff724f]"
                >
                  View all integrations →
                </Link>
              </div>
            )}
          </div>
          <Link href="/about" className={`py-1 ${linkClass('about')}`} onClick={() => setMobileOpen(false)}>About Us</Link>
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
