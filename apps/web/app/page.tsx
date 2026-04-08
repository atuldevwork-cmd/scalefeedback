import Link from 'next/link';
import { MarketingNavbar } from '@/components/marketing-navbar';

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
      <section className="bg-orange-50 py-14 border-y border-orange-100">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-[#ff724f] uppercase tracking-widest mb-8">Security & Compliance</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: 'verified_user', label: 'GDPR Compliant', desc: 'Fully compliant with EU data regulations' },
              { icon: 'security', label: 'SOC 2 Type II', desc: 'Independently audited security controls' },
              { icon: 'lock', label: 'Data Privacy First', desc: 'Your data is never sold or shared' },
              { icon: 'key', label: 'SSO Supported', desc: 'Works with Google, Okta, and more' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-orange-100 rounded-2xl p-5 flex flex-col items-center text-center gap-3 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#300a46] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 24 }}>{item.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#300a46]">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-[#300a46] text-purple-300 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-xs">SF</div>
              <span className="font-bold text-white text-sm">ScaleFeedback</span>
            </div>
            <p className="text-xs leading-relaxed">For a web free of bugs. Built by ScaleStation.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-200 uppercase tracking-widest mb-3">Product</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#integrations" className="hover:text-white transition-colors">Integrations</a></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-200 uppercase tracking-widest mb-3">Company</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="mailto:hello@scalefeedback.io" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-200 uppercase tracking-widest mb-3">Account</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/signup" className="hover:text-[#ff724f] transition-colors">Start free trial</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pt-6 border-t border-purple-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} ScaleFeedback. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-purple-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-purple-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
