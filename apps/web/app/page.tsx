import Link from 'next/link';
import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';

const INTEGRATIONS = ['Jira', 'GitHub', 'ClickUp', 'Slack', 'Linear', 'Trello', 'Asana', 'Notion'];

const FEATURES = [
  {
    badge: 'Feedback Widget',
    headline: 'Collect feedback without leaving the browser',
    desc: 'Embed a lightweight widget on any website. Your users click, annotate a screenshot, and submit — instantly, without switching tools or writing long emails.',
    quote: '"We can log issues directly on our site, without ever leaving the browser."',
    author: 'Sarah M., QA Lead',
    visual: (
      <div className="bg-gradient-to-br from-purple-50 to-orange-50 rounded-2xl p-6 h-64 flex items-center justify-center border border-purple-100">
        <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-slate-400 ml-1 font-mono">mysite.com</span>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-4/5" />
            <div className="h-3 bg-orange-100 rounded w-3/5 border border-orange-300 border-dashed" />
          </div>
          <div className="mt-4 flex justify-end">
            <div className="bg-[#ff724f] text-white text-xs px-3 py-1.5 rounded-lg font-medium">Report bug</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    badge: 'Bug Reporting',
    headline: 'Developers get everything they need to fix issues',
    desc: 'Every report includes browser, OS, screen resolution, console errors, and failed network requests — captured automatically. No more "it works on my machine."',
    quote: '"Developers finally have everything they need to debug and fix issues without asking follow-up questions."',
    author: 'Alex T., Engineering Manager',
    visual: (
      <div className="bg-gradient-to-br from-purple-50 to-slate-50 rounded-2xl p-6 h-64 flex flex-col gap-2 border border-purple-100">
        {[
          { label: 'Browser', value: 'Chrome 124', color: 'bg-orange-50 text-[#ff724f]' },
          { label: 'OS', value: 'macOS Sonoma', color: 'bg-purple-50 text-[#300a46]' },
          { label: 'Screen', value: '1440 × 900', color: 'bg-green-50 text-green-700' },
          { label: 'Console', value: '2 errors', color: 'bg-red-50 text-red-700' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-lg px-3 py-2 flex items-center justify-between border border-slate-100 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">{item.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    badge: 'Team Collaboration',
    headline: 'Manage all feedback in one dashboard',
    desc: 'Assign issues, update statuses, leave comments, and sync with your existing project management tools. Your whole team stays on the same page.',
    quote: '"We cut down emails and Slack messages by 70% since switching to ScaleFeedback."',
    author: 'Priya K., Product Manager',
    visual: (
      <div className="bg-gradient-to-br from-orange-50 to-purple-50 rounded-2xl p-5 h-64 border border-orange-100 overflow-hidden">
        <div className="space-y-2">
          {[
            { title: 'Login button broken on mobile', status: 'Open', color: 'bg-red-100 text-red-700' },
            { title: 'Checkout form validation missing', status: 'In Review', color: 'bg-orange-100 text-[#ff724f]' },
            { title: 'Dark mode contrast issue', status: 'Resolved', color: 'bg-green-100 text-green-700' },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-lg px-3 py-2.5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 truncate">{item.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${item.color}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const STATS = [
  { value: '3,000+', label: 'Active teams' },
  { value: '3×', label: 'More bugs reported' },
  { value: '3.8M+', label: 'Issues collected' },
  { value: '50%', label: 'Faster resolution' },
];

const TESTIMONIALS = [
  {
    quote: 'ScaleFeedback changed the way our team handles QA. We identify and resolve issues 10× faster than before.',
    name: 'James R.',
    role: 'CTO, TechCorp',
    initials: 'JR',
    color: 'bg-[#300a46]',
  },
  {
    quote: 'This tool completely changed how we report website feedback. Clients love how easy it is.',
    name: 'Megan C.',
    role: 'Product Designer, Mantra',
    initials: 'MC',
    color: 'bg-[#ff724f]',
  },
  {
    quote: 'No more long email threads. Everything is in one place and synced with our Jira board automatically.',
    name: 'Cody W.',
    role: 'Engineering Lead',
    initials: 'CW',
    color: 'bg-violet-600',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      <MarketingNavbar activePage="home" />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-[#ff724f] rounded-full px-4 py-1.5 text-sm font-medium mb-8">
          <span className="w-1.5 h-1.5 bg-[#ff724f] rounded-full animate-pulse" />
          Website feedback tool for dev teams
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-[#300a46] leading-tight mb-6 max-w-3xl mx-auto">
          The website feedback tool for{' '}
          <span className="text-[#ff724f]">bug reporting, QA & UAT</span>
        </h1>

        <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          Collect visual feedback directly on your website. Annotate screenshots, auto-capture technical context,
          and sync with your dev tools — all in one place.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          <Link
            href="/signup"
            className="bg-[#ff724f] hover:bg-[#e8623f] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-orange-200"
          >
            Start free trial
          </Link>
          <Link
            href="/login"
            className="bg-white hover:bg-slate-50 text-[#300a46] font-semibold px-8 py-3.5 rounded-xl transition-colors text-base border border-slate-200"
          >
            Sign in to dashboard →
          </Link>
        </div>
        <p className="text-sm text-slate-400">15-day free trial · No credit card required</p>

        {/* Product preview */}
        <div className="mt-14 bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-5 py-3 flex items-center gap-2 border-b border-slate-200">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-slate-400 text-xs font-mono">app.scalefeedback.io/projects</span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Client Portal', domain: 'clientportal.io', count: 18, color: '#300a46', status: 'Active' },
              { name: 'E-Commerce App', domain: 'mystore.com', count: 7, color: '#ff724f', status: 'Active' },
              { name: 'Marketing Site', domain: 'brand.co', count: 3, color: '#7c3aed', status: 'Active' },
            ].map((p) => (
              <div key={p.name} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-left">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: p.color }}>
                    {p.name[0]}
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">{p.status}</span>
                </div>
                <p className="font-semibold text-[#300a46] text-sm">{p.name}</p>
                <p className="text-slate-400 text-xs mt-0.5">{p.domain}</p>
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{p.count} feedback items</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logo bar */}
        <div className="mt-12">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-5">Trusted by teams at</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-40">
            {["Acme Corp", "L'Oréal", "Patreon", "Fujitsu", "Amgen", "FantasyPros"].map(name => (
              <span key={name} className="text-sm font-bold text-[#300a46]">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <section className="bg-[#300a46] py-16">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-4xl font-extrabold text-[#ff724f] mb-1">{s.value}</div>
              <div className="text-sm text-purple-200">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-4xl font-extrabold text-[#300a46] mb-4">Everything your team needs</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">One tool to collect, manage, and resolve all website feedback — from QA to client reviews.</p>
        </div>
        <div className="space-y-24">
          {FEATURES.map((f, i) => (
            <div key={f.badge} className={`flex flex-col md:flex-row gap-12 items-center ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
              <div className="flex-1">
                <span className="text-xs font-semibold text-[#ff724f] uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full border border-orange-100">{f.badge}</span>
                <h3 className="text-3xl font-extrabold text-[#300a46] mt-4 mb-4 leading-snug">{f.headline}</h3>
                <p className="text-slate-500 leading-relaxed mb-6">{f.desc}</p>
                <blockquote className="border-l-4 border-[#ff724f] pl-4">
                  <p className="text-slate-700 italic text-sm">{f.quote}</p>
                  <footer className="text-xs text-slate-400 mt-1 font-medium">— {f.author}</footer>
                </blockquote>
              </div>
              <div className="flex-1 w-full">{f.visual}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Integrations ───────────────────────────────────────── */}
      <section id="integrations" className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Integrations</p>
          <h2 className="text-3xl font-extrabold text-[#300a46] mb-4">Works with your existing tools</h2>
          <p className="text-slate-500 mb-12 max-w-xl mx-auto">Sync feedback directly to your project management tool. No copy-pasting, no context switching.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {INTEGRATIONS.map(name => (
              <div key={name} className="bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-semibold text-[#300a46] shadow-sm hover:border-[#ff724f] hover:shadow-md transition-all">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────── */}
      <section id="testimonials" className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Testimonials</p>
          <h2 className="text-3xl font-extrabold text-[#300a46]">Loved by product teams</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-orange-200 transition-all">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">{t.quote}</p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold`}>{t.initials}</div>
                <div>
                  <p className="text-sm font-semibold text-[#300a46]">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rating badges */}
        <div className="flex flex-wrap justify-center gap-8 mt-12">
          {[
            { platform: 'G2', score: '4.7/5', reviews: '22 reviews' },
            { platform: 'Capterra', score: '4.8/5', reviews: '52 reviews' },
            { platform: 'Chrome Store', score: '4.3/5', reviews: '185 reviews' },
          ].map(r => (
            <div key={r.platform} className="text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">{r.platform}</div>
              <div className="text-2xl font-extrabold text-[#300a46]">{r.score}</div>
              <div className="text-xs text-slate-400">{r.reviews}</div>
            </div>
          ))}
        </div>
      </section>


      {/* ── Security ───────────────────────────────────────────── */}
      <section className="relative bg-[#1a0530] py-24 overflow-hidden">
        {/* ambient glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#ff724f] opacity-10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500 opacity-10 blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-[#ff724f] rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-widest mb-6">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Security & Compliance
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              Enterprise-grade security,<br className="hidden md:block" /> built in from day one
            </h2>
            <p className="text-purple-300 text-lg max-w-xl mx-auto leading-relaxed">
              Your data is protected by industry-leading practices. We take compliance seriously so you don&apos;t have to.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
            {[
              {
                badge: 'EU Ready',
                label: 'GDPR Compliant',
                desc: 'Fully compliant with EU data regulations',
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
              },
              {
                badge: 'Audited',
                label: 'SOC 2 Type II',
                desc: 'Independently audited security controls',
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
                  </svg>
                ),
              },
              {
                badge: 'Zero Share',
                label: 'Data Privacy First',
                desc: 'Your data is never sold or shared',
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ),
              },
              {
                badge: 'SAML 2.0',
                label: 'SSO Supported',
                desc: 'Works with Google, Okta, and more',
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                ),
              },
            ].map(item => (
              <div key={item.label} className="group bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center gap-3 hover:bg-white/[0.08] hover:border-[#ff724f]/30 transition-all duration-200">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff724f] to-[#d95f3a] flex items-center justify-center shadow-lg shadow-orange-900/30 shrink-0">
                  {item.icon}
                </div>
                <div>
                  <span className="inline-block text-[10px] font-bold text-[#ff724f] uppercase tracking-widest bg-orange-500/10 border border-orange-500/20 rounded-full px-2 py-0.5 mb-2">{item.badge}</span>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-purple-400 mt-1 leading-snug">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust strip */}
          <div className="border-t border-white/10 pt-8 flex flex-wrap justify-center gap-x-8 gap-y-3">
            {[
              '256-bit AES encryption',
              '99.9% uptime SLA',
              'EU & US data residency',
              'Daily automated backups',
              'Penetration tested',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-purple-400 text-sm">
                <svg className="w-4 h-4 text-[#ff724f] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />

    </div>
  );
}
