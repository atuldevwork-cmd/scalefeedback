import Link from 'next/link';
import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';
import { FeaturesSection } from '@/components/features-tabs';
import { appUrl } from '@/lib/app-url';


const INTEGRATIONS = [
  {
    name: 'ClickUp',
    category: 'Project Management',
    desc: 'Push feedback directly to ClickUp tasks. Keep your team moving without switching tools.',
    logo: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
        <path d="M1.286 17.143L4.8 14c2.057 2.057 4.286 3.2 7.2 3.2 2.914 0 5.143-1.143 7.2-3.2l3.514 3.143C19.771 20.4 16.457 22.286 12 22.286c-4.457 0-7.8-1.886-10.714-5.143z" fill="#7B68EE"/>
        <path d="M12 1.714L3.429 9.143l2.571 2.857L12 7.286l6 4.714 2.571-2.857L12 1.714z" fill="#8930FD"/>
      </svg>
    ),
  },
  {
    name: 'Jira',
    category: 'Project Management',
    desc: 'Auto-create Jira issues from every feedback report — screenshots, URL, browser, and OS all attached.',
    logo: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
        <path d="M11.571 0C5.18 0 0 5.18 0 11.571c0 6.392 5.18 11.572 11.571 11.572C17.964 23.143 23.143 17.963 23.143 11.571 23.143 5.18 17.964 0 11.571 0zm5.252 13.1l-5.252 5.252-5.252-5.252 3.003-3.003 2.249 2.249 2.249-2.249 3.003 3.003zm0-4.247L14.32 6.35l-2.749 2.749-2.749-2.749-2.503 2.503 5.252-5.252 5.252 5.252z" fill="#2684FF"/>
      </svg>
    ),
  },
  {
    name: 'GitHub',
    category: 'Issue Tracker',
    desc: 'Turn website bugs into GitHub issues instantly. Developers get full context in one place.',
    logo: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#24292E">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
  },
  {
    name: 'Slack',
    category: 'Communication',
    desc: 'Get real-time Slack alerts for new feedback. Loop in your team the moment a bug is reported.',
    logo: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
        <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.52A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z" fill="#E01E5A"/>
        <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" fill="#36C5F0"/>
        <path d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312z" fill="#2EB67D"/>
        <path d="M15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" fill="#ECB22E"/>
      </svg>
    ),
  },
];


const STEPS = [
  {
    icon: 'code',
    num: '01',
    title: 'One script tag. You\'re live.',
    desc: 'Drop a single script tag into your site. Works with any stack — WordPress, HubSpot, React, Vue, or plain HTML.',
  },
  {
    icon: 'edit_note',
    num: '02',
    title: 'Annotate & report',
    desc: 'Anyone clicks anywhere on your live site to leave visual feedback with screenshots and auto-captured context.',
  },
  {
    icon: 'send',
    num: '03',
    title: 'Fix in your tools',
    desc: 'Sync to Jira, ClickUp, GitHub, Slack, or 20+ tools in one click. No copy-paste, no lost context.',
  },
];


const FAQ = [
  {
    q: 'What is Pinmarks?',
    a: 'Pinmarks is a visual website feedback tool for bug reporting, QA, and UAT. It lets anyone click on a live page to annotate issues — and automatically captures screenshots, browser, OS, URL, and console errors so developers have everything they need to reproduce and fix the bug.',
  },
  {
    q: 'Who is Pinmarks for, and can I use it for design feedback too?',
    a: 'Pinmarks is built for product teams, QA engineers, developers, and agencies. Yes — you can use it for design feedback, content reviews, client approvals, and UAT, not just bug reporting.',
  },
  {
    q: 'How easy is it to set up for bug reporting and website testing?',
    a: 'Very easy. Drop a single script tag into your site — or use our WordPress or HubSpot plugin. Most teams are collecting their first feedback within 2 minutes of signing up. No developer needed for the initial setup.',
  },
  {
    q: 'Will Pinmarks slow down my website?',
    a: 'No. The Pinmarks widget is lazy-loaded and runs entirely in the background — zero impact on your page performance or Core Web Vitals.',
  },
  {
    q: 'Can I use Pinmarks for QA and user acceptance testing (UAT)?',
    a: 'Yes. Pinmarks is designed for exactly this. Your QA team or clients can annotate issues directly on the live site without needing an account. All feedback lands in one place with full technical context attached.',
  },
  {
    q: 'Do reporters need an account to submit feedback?',
    a: 'No. Anyone with access to your site can click the widget and submit feedback without signing up — perfect for client reviews and UAT sessions. Only your internal team members need a Pinmarks account.',
  },
  {
    q: 'How much does Pinmarks cost?',
    a: 'Plans start at $9/mo (billed annually) or $12/mo monthly. The Pro plan is $29/mo (annual) and Agency is $59/mo (annual). Every plan includes a 15-day free trial with no credit card required.',
  },
  {
    q: 'What happens after my free trial ends?',
    a: 'After 15 days your account moves to a read-only state — no data is lost. You can upgrade to any paid plan at any time to continue.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans">
      <MarketingNavbar activePage="home" />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-[#111111] relative overflow-hidden">
        {/* Yellow glow at top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,200,0,0.18) 0%, transparent 65%)' }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-0 text-center">
          <h1 className="text-5xl md:text-[72px] font-black text-white leading-[1.04] mb-6 max-w-4xl mx-auto tracking-tight">
            Website feedback that{' '}
            <span className="text-[#ff724f]">gets bugs fixed</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Annotate any live page, auto-capture screenshots and browser context, then push straight to ClickUp, Jira, GitHub, or Slack — no email chains, no missing details.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Link
              href={appUrl('/signup')}
              className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-bold px-9 py-4 rounded-xl transition-all text-base shadow-lg shadow-yellow-500/20 hover:shadow-none hover:-translate-y-px"
            >
              Start free trial →
            </Link>
            <Link
              href="/demo"
              className="bg-white/5 hover:bg-white/10 text-white font-semibold px-9 py-4 rounded-xl transition-all text-base border border-white/10 hover:border-white/20"
            >
              Watch demo
            </Link>
          </div>
          <p className="text-sm text-gray-500 mb-16">15-day free trial · No credit card required</p>
        </div>

      </section>


      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#111111] leading-tight mb-3">
              Three steps. Zero friction.
            </h2>
            <p className="text-[#555555] text-lg">Up and running in minutes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector */}
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-[#ff724f]/40 via-[#ff724f] to-[#ff724f]/40" />

            {STEPS.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center px-4">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-[#111111] rounded-3xl flex items-center justify-center shadow-xl">
                    <span className="material-symbols-outlined text-[#ff724f] text-[32px]">{step.icon}</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-[#ff724f] rounded-full flex items-center justify-center text-white text-xs font-black shadow-md border-2 border-white">
                    {i + 1}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[#111111] mb-2">{step.title}</h3>
                <p className="text-[#555555] text-sm leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              href={appUrl('/signup')}
              className="inline-flex items-center gap-2 bg-[#ff724f] hover:bg-[#e8603a] text-white font-bold px-8 py-4 rounded-xl transition-all text-base hover:-translate-y-px"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES (tabbed) ─────────────────────────────────────── */}
      <FeaturesSection />

      {/* ── INTEGRATIONS ──────────────────────────────────────────── */}
      <section id="integrations" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Integrations</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#111111] leading-tight mb-4">
              Works where your<br />team already is
            </h2>
            <p className="text-[#555555] text-lg max-w-lg mx-auto">
              One-click sync to the tools your team uses every day — no copy-paste, no lost context.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {INTEGRATIONS.map(tool => (
              <div
                key={tool.name}
                className="group bg-[#F9F9F9] rounded-2xl p-6 flex items-start gap-5 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all border border-transparent hover:border-gray-200"
              >
                {/* Brand icon */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-white border border-gray-200 shadow-sm p-3">
                  {tool.logo}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-bold text-[#111111] text-lg">{tool.name}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ff724f]/20 text-[#ff724f] border border-[#ff724f]/30">
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-[#555555] text-sm leading-relaxed">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-4xl font-black text-[#111111]">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map(item => (
              <details key={item.q} className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <summary className="flex items-center justify-between px-7 py-5 cursor-pointer list-none text-[#111111] font-semibold text-base gap-6">
                  <span className="leading-snug">{item.q}</span>
                  <span className="material-symbols-outlined text-gray-400 shrink-0 text-[22px] transition-transform duration-200 group-open:rotate-180 group-open:text-[#ff724f]">
                    expand_more
                  </span>
                </summary>
                <div className="px-7 pb-6 text-[#555555] leading-relaxed text-sm border-t border-gray-100 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-10">
            Still have questions?{' '}
            <Link href="/contact" className="text-[#ff724f] font-semibold hover:text-[#e8603a] transition-colors">
              Talk to us →
            </Link>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="bg-[#111111] py-28 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(245,200,0,0.12) 0%, transparent 60%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[#ff724f]/10 border border-[#ff724f]/20 text-[#ff724f] rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-[#ff724f] rounded-full" />
            No credit card required
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white mb-5 leading-tight tracking-tight">
            Stop chasing bugs.<br />
            <span className="text-[#ff724f]">Start pinning them.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Start collecting visual feedback today — fix bugs faster and keep your whole team in the loop.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={appUrl('/signup')}
              className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-bold px-10 py-4 rounded-xl transition-all text-base shadow-lg shadow-yellow-500/20 hover:shadow-none hover:-translate-y-px"
            >
              Start free trial →
            </Link>
            <Link
              href="/contact"
              className="bg-white/5 hover:bg-white/10 text-white font-semibold px-10 py-4 rounded-xl transition-all text-base border border-white/10 hover:border-white/20"
            >
              Talk to sales
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-5">15-day free trial · No credit card · Cancel anytime</p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
