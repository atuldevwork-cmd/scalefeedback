import Link from 'next/link';
import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';
import { FeaturesSection } from '@/components/features-tabs';


const INTEGRATIONS = [
  {
    name: 'Jira',
    category: 'Project Management',
    desc: 'Auto-create Jira issues from every feedback report with screenshots, URL, browser, and OS attached.',
    color: '#0052CC',
    letter: 'J',
  },
  {
    name: 'ClickUp',
    category: 'Project Management',
    desc: 'Push feedback directly to ClickUp tasks. Keep your team moving without switching tools.',
    color: '#7B68EE',
    letter: 'CU',
  },
  {
    name: 'GitHub',
    category: 'Issue Tracker',
    desc: 'Turn website bugs into GitHub issues instantly. Developers get full context in one place.',
    color: '#24292E',
    letter: 'GH',
  },
  {
    name: 'Slack',
    category: 'Communication',
    desc: 'Get real-time Slack alerts for new feedback. Loop in your team the moment a bug is reported.',
    color: '#4A154B',
    letter: 'S',
  },
];


const STEPS = [
  {
    icon: 'code',
    num: '01',
    title: 'Install in 2 minutes',
    desc: 'Drop a single script tag into your site. Works with any stack — WordPress, React, Vue, or plain HTML.',
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
    desc: 'Sync to Jira, GitHub, Slack, or 20+ tools in one click. No copy-paste, no lost context.',
  },
];


const FAQ = [
  {
    q: 'What is Pinmarks?',
    a: 'Pinmarks is a visual website feedback tool for bug reporting, UAT, and annotations. It captures screenshots, metadata, and annotations — and integrates with Jira, ClickUp, GitHub, Slack, and more.',
  },
  {
    q: 'Who is it for?',
    a: 'Teams that ship and maintain websites: product managers, QA engineers, designers, agencies, and anyone who needs structured visual feedback from clients or stakeholders.',
  },
  {
    q: 'How easy is setup?',
    a: 'Embed a single script tag or use our WordPress plugin. Most teams are collecting feedback within 2 minutes of signing up.',
  },
  {
    q: 'Will it slow down my website?',
    a: 'No. The Pinmarks widget is lazy-loaded and runs entirely in the background — zero impact on page performance.',
  },
  {
    q: 'Do reporters need an account?',
    a: 'No. Anyone can submit feedback via the widget without creating an account — perfect for client reviews and UAT sessions.',
  },
  {
    q: 'How much does it cost?',
    a: 'Plans start at $39/month. Every plan includes a 15-day free trial with no credit card required.',
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
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#ff724f]/10 border border-[#ff724f]/20 text-[#ff724f] rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-[#ff724f] rounded-full animate-pulse" />
            Trusted by 3,000+ development teams
          </div>

          <h1 className="text-5xl md:text-[72px] font-black text-white leading-[1.04] mb-6 max-w-4xl mx-auto tracking-tight">
            Collect website feedback{' '}
            <span className="text-[#ff724f]">10× faster</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Visual annotations, auto-captured bug context, and one-click sync to Jira, ClickUp, GitHub, and Slack.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Link
              href="/signup"
              className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-bold px-9 py-4 rounded-xl transition-all text-base shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30 hover:-translate-y-px"
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

          {/* Product mockup */}
          <div className="relative max-w-5xl mx-auto">
            <div
              className="absolute -inset-6 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(245,200,0,0.08) 0%, transparent 70%)' }}
            />
            <div className="relative bg-white rounded-2xl border border-gray-200 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Browser bar */}
              <div className="bg-[#F4F4F5] border-b border-gray-200 px-5 py-3 flex items-center gap-3">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 max-w-xs mx-auto bg-white rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-400 font-mono text-center">
                  mywebsite.com/checkout
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-5 h-5 rounded bg-gray-200" />
                  <div className="w-5 h-5 rounded bg-gray-200" />
                  <div className="w-5 h-5 rounded bg-gray-200" />
                </div>
              </div>

              {/* Simulated page */}
              <div className="p-7 bg-white relative min-h-[360px]">
                {/* Nav skeleton */}
                <div className="flex items-center justify-between mb-7 pb-5 border-b border-gray-100">
                  <div className="w-24 h-5 bg-gray-900 rounded" />
                  <div className="hidden sm:flex gap-5">
                    {[64, 52, 72, 56].map((w, i) => (
                      <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <div className="w-28 h-9 bg-[#ff724f] rounded-lg" />
                </div>

                <div className="grid grid-cols-5 gap-6">
                  {/* Main content */}
                  <div className="col-span-3 space-y-3">
                    <div className="h-7 bg-gray-900 rounded-lg w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                    <div className="h-4 bg-gray-200 rounded w-4/6" />
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 bg-gray-100 rounded-xl border border-gray-200" />
                      ))}
                    </div>
                    {/* Annotated element */}
                    <div className="relative mt-3">
                      <div className="h-11 bg-[#fff3f0] border-2 border-[#ff724f] border-dashed rounded-xl flex items-center px-4">
                        <span className="text-xs text-[#ff724f] font-medium">Payment button not responding on iOS Safari</span>
                      </div>
                      <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#ff724f] rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg border-2 border-white">3</div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="col-span-2 space-y-3">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                      <div className="h-28 bg-gray-200 rounded-lg mb-3" />
                      <div className="h-10 bg-[#ff724f] rounded-lg" />
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>

                {/* Annotation pins */}
                <div className="absolute top-[88px] left-[144px] w-5 h-5 bg-[#ff724f] rounded-full flex items-center justify-center text-white text-[9px] font-black shadow-md border-2 border-white z-10">1</div>
                <div className="absolute top-[148px] left-[220px] w-5 h-5 bg-[#111111] rounded-full flex items-center justify-center text-white text-[9px] font-black shadow-md border-2 border-white z-10">2</div>

                {/* Floating feedback panel */}
                <div className="absolute top-12 right-5 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-52 text-left hidden md:block">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-full bg-[#ff724f] flex items-center justify-center text-white text-[9px] font-black shrink-0">MC</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#111111] leading-tight">Megan C.</p>
                      <p className="text-[10px] text-gray-400">just now</p>
                    </div>
                    <span className="shrink-0 text-[9px] bg-[#fff3f0] text-[#ff724f] border border-yellow-200 px-1.5 py-0.5 rounded font-semibold">NEW</span>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {[
                      { k: 'Browser', v: 'Safari 17' },
                      { k: 'OS', v: 'iOS 17.4' },
                      { k: 'Screen', v: '390 × 844' },
                      { k: 'Errors', v: '2 found', red: true },
                    ].map(r => (
                      <div key={r.k} className="flex justify-between text-[10px]">
                        <span className="text-gray-400">{r.k}</span>
                        <span className={`font-medium ${r.red ? 'text-red-500' : 'text-[#111111]'}`}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full bg-[#111111] text-white text-[10px] font-bold py-2.5 rounded-xl">
                    Send to Jira →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>


      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#111111] leading-tight">
              Up and running in minutes
            </h2>
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
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#ff724f] hover:bg-[#e8603a] text-white font-bold px-8 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-yellow-200 hover:-translate-y-px"
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
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md"
                  style={{ backgroundColor: tool.color }}
                >
                  {tool.letter}
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


      {/* ── ANALYTICS SNIPPET ─────────────────────────────────────── */}
      <section className="py-20 bg-[#F9F9F9]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            {/* Text */}
            <div className="flex-1 lg:max-w-md">
              <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Analytics</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#111111] mb-5 leading-tight">
                Track team performance<br />at a glance
              </h2>
              <p className="text-[#555555] leading-relaxed mb-6">
                See resolution rates, average fix time, and open issues — and share the data with stakeholders in seconds.
              </p>
              <blockquote className="border-l-4 border-[#ff724f] pl-5">
                <p className="text-[#555555] italic text-sm">&ldquo;Now I can show stakeholders how fast we resolve issues — and see my team&rsquo;s efficiency in one place.&rdquo;</p>
                <footer className="text-xs text-gray-400 mt-1.5 font-semibold">— Nick Floro, Founder at Sealworks Interactive Studio</footer>
              </blockquote>
            </div>

            {/* Dashboard mockup */}
            <div className="flex-1 w-full">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'Resolved this sprint', value: '24', delta: '+12% vs last sprint', green: true },
                    { label: 'Avg. resolution time', value: '2.3d', delta: '−18% vs last sprint', green: true },
                    { label: 'Open issues', value: '8', delta: '−5 vs last sprint', green: true },
                    { label: 'Active contributors', value: '5', delta: 'Team members', green: false },
                  ].map(m => (
                    <div key={m.label} className="bg-[#F9F9F9] rounded-xl p-4 border border-gray-100">
                      <p className="text-xs text-[#555555] mb-1.5 leading-tight">{m.label}</p>
                      <p className="text-2xl font-black text-[#111111]">{m.value}</p>
                      <p className={`text-xs font-semibold mt-1 ${m.green ? 'text-emerald-600' : 'text-[#555555]'}`}>{m.delta}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[#F9F9F9] rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-[#555555] mb-3 font-semibold">Issues resolved per day</p>
                  <div className="flex items-end gap-1 h-16">
                    {[3, 5, 4, 7, 6, 8, 4, 10, 7, 5, 9, 11, 8, 14].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm transition-all"
                        style={{
                          height: `${(h / 14) * 100}%`,
                          backgroundColor: i === 13 ? '#ff724f' : '#E5E7EB',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY ──────────────────────────────────────────────── */}
      <section className="bg-[#111111] py-24 relative overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,200,0,0.08) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Security & Privacy</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">Your data, protected</h2>
          <p className="text-gray-400 text-lg max-w-lg mx-auto mb-14">
            Industry-leading security and compliance so you can focus on shipping, not worrying.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              { badge: 'EU Ready', label: 'GDPR Compliant', desc: 'Support for GDPR requirements with data centers in Europe.' },
              { badge: 'Audited', label: 'SOC 2 Type II', desc: 'Security certification conducted by an independent external auditor.' },
              { badge: 'Zero Share', label: 'Privacy Tools', desc: 'Obfuscate sensitive or personal data directly on your site.' },
            ].map(item => (
              <div
                key={item.label}
                className="bg-white/5 border border-white/10 rounded-2xl p-7 flex flex-col gap-4 text-left hover:bg-white/[0.08] hover:border-[#ff724f]/30 transition-all"
              >
                <span className="text-[10px] font-bold text-[#ff724f] uppercase tracking-widest bg-[#ff724f]/10 border border-[#ff724f]/20 rounded-full px-2.5 py-1 w-fit">
                  {item.badge}
                </span>
                <p className="text-base font-bold text-white">{item.label}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <Link
            href="/security"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff724f] hover:text-white transition-colors"
          >
            View our security commitment →
          </Link>
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
              <details key={item.q} className="group bg-[#F5F5F2] rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-7 py-6 cursor-pointer list-none text-[#111111] font-bold text-lg gap-6">
                  <span className="leading-snug">{item.q}</span>
                  <span className="material-symbols-outlined text-gray-400 shrink-0 text-[22px] transition-transform duration-200 group-open:rotate-180 group-open:text-[#ff724f]">
                    expand_more
                  </span>
                </summary>
                <div className="px-7 pb-7 text-[#555555] leading-relaxed text-base border-t border-black/5 pt-5">
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
            Ship better websites.<br />
            <span className="text-[#ff724f]">Start today.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Join 3,000+ teams already using Pinmarks to collect visual feedback and resolve bugs faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-bold px-10 py-4 rounded-xl transition-all text-base shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30 hover:-translate-y-px"
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
