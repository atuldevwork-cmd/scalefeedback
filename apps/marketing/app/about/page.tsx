import Link from 'next/link';
import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';
import { appUrl } from '@/lib/app-url';

const TEAM = [
  {
    name: 'Dharmesh Porwal',
    role: 'Founder & CEO',
    photo: '/team/dharmesh-porwal.png',
    bio: '20 years scaling businesses, founded on one belief, strategy before software.',
  },
  {
    name: 'Kieran Krohn',
    role: 'Head of Growth',
    photo: '/team/kieran-krohn.png',
    bio: "8 years as HubSpot's #1 consultant, now fixing GTM for mid-market B2B companies.",
  },
  {
    name: 'Kritika Thakur',
    role: 'Account Strategist',
    photo: '/team/kritika-thakur.png',
    bio: 'Certified strategist bringing strategic CRM thinking and a sharp eye for execution.',
  },
];

const VALUES = [
  {
    icon: (
      <svg className="w-6 h-6 text-[#ff724f]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'Context over chaos',
    desc: 'A bug report without context is just noise. Every Pinmarks report arrives with browser, OS, URL, console errors, and a screenshot — so developers can fix it without a single follow-up.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#ff724f]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
    title: 'Simplicity is the feature',
    desc: 'If submitting feedback requires a tutorial, the tool has already failed. We obsess over removing every unnecessary step — for reporters, developers, and everyone in between.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#ff724f]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Developers deserve better',
    desc: 'Vague screenshots and "it\'s broken" messages waste developer time. We build tools that give devs exactly what they need to reproduce and fix bugs on the first try.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#ff724f]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Built for every role',
    desc: 'QA engineers, product managers, designers, agencies, clients — Pinmarks works for everyone who touches a website, not just the dev team.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <MarketingNavbar />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 bg-[#fff3f0] border border-yellow-200 text-[#ff724f] rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-[#ff724f] rounded-full" />
            Our story
          </div>
          <h1 className="text-5xl font-extrabold text-[#111111] leading-tight mb-6">
            Built for teams tired of <span className="text-[#ff724f]">chasing bugs</span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed">
            Pinmarks was born from a simple frustration — bug reporting was broken. Screenshots without context. Emails with no follow-up. Jira tickets developers couldn&apos;t reproduce. We built the tool we always wished existed.
          </p>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Our mission</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#111111] mb-5 leading-snug">
              Fixing the way teams report bugs
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
              We started Pinmarks after watching QA teams drown in screenshots attached to emails, Slack threads with no context, and Jira tickets that developers couldn&apos;t reproduce. There had to be a better way.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                label: 'The problem',
                icon: 'warning',
                iconColor: 'text-red-400',
                iconBg: 'bg-red-100',
                bg: 'bg-red-50 border-red-100',
                heading: 'Bug reporting was broken',
                desc: 'Screenshots without context. Five-email threads to explain one issue. Jira tickets with "it\'s broken" and nothing else.',
              },
              {
                label: 'Our approach',
                icon: 'push_pin',
                iconColor: 'text-[#ff724f]',
                iconBg: 'bg-orange-100',
                bg: 'bg-[#fff3f0] border-orange-100',
                heading: 'Pin it. Auto-capture everything.',
                desc: 'Click on any live page to annotate an issue. Pinmarks captures browser, OS, URL, console errors, and a screenshot automatically.',
              },
              {
                label: 'The outcome',
                icon: 'check_circle',
                iconColor: 'text-emerald-500',
                iconBg: 'bg-emerald-100',
                bg: 'bg-emerald-50 border-emerald-100',
                heading: 'Developers fix it first time',
                desc: 'No back-and-forth. No missing context. Every bug report arrives with everything a developer needs to reproduce and fix the issue.',
              },
            ].map(card => (
              <div key={card.label} className={`rounded-2xl border p-7 ${card.bg}`}>
                <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center mb-5`}>
                  <span className={`material-symbols-outlined ${card.iconColor}`} style={{ fontSize: 22 }}>{card.icon}</span>
                </div>
                <p className="text-xs font-bold text-[#ff724f] uppercase tracking-widest mb-2">{card.label}</p>
                <h3 className="text-base font-bold text-[#111111] mb-3">{card.heading}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="bg-[#F9F9F9] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">What drives us</p>
            <h2 className="text-3xl font-extrabold text-[#111111]">Our values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#fff3f0] flex items-center justify-center shrink-0">
                  {v.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[#111111] mb-1">{v.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── CTA ── */}
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
            Ready to squash<br />
            <span className="text-[#ff724f]">some bugs?</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Start collecting visual feedback today — fix bugs faster and keep your whole team in the loop.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={appUrl('/signup')}
              className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-bold px-10 py-4 rounded-xl transition-all text-base shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30 hover:-translate-y-px"
            >
              Start free trial →
            </Link>
            <Link
              href="/contact"
              className="bg-white/5 hover:bg-white/10 text-white font-semibold px-10 py-4 rounded-xl transition-all text-base border border-white/10 hover:border-white/20"
            >
              Talk to us
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-5">15-day free trial · No credit card · Cancel anytime</p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
