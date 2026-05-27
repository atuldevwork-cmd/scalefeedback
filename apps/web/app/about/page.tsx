import Link from 'next/link';
import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';

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
    title: 'Speed matters',
    desc: 'Every second a bug sits unfixed costs your team money. We obsess over making the feedback loop as short as possible.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#ff724f]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
    title: 'Simplicity first',
    desc: 'If your users need a manual to report a bug, the tool has failed. We build for the path of least resistance.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#ff724f]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Trust by default',
    desc: 'Security and privacy are not checkboxes for us — they are core to how we design every feature from day one.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#ff724f]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Built for teams',
    desc: 'Great software is made by teams, not individuals. Everything we build is designed to make collaboration effortless.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <MarketingNavbar />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-[#ff724f] rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-[#ff724f] rounded-full" />
            Our story
          </div>
          <h1 className="text-5xl font-extrabold text-[#300a46] leading-tight mb-6">
            Built for teams tired of <span className="text-[#ff724f]">chasing bugs</span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed">
            ScaleFeedback was born from a simple frustration — reporting a bug should never require a five-email thread.
            We&apos;re a small team on a mission to make the web free of bugs, one annotated screenshot at a time.
          </p>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="py-20 max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Our mission</p>
          <h2 className="text-3xl font-extrabold text-[#300a46] mb-5 leading-snug">
            A web free of bugs, built one team at a time
          </h2>
          <p className="text-slate-500 leading-relaxed mb-4">
            We started ScaleFeedback after watching QA teams drown in screenshots attached to emails, Slack threads with no context, and Jira tickets that developers couldn&apos;t reproduce.
          </p>
          <p className="text-slate-500 leading-relaxed">
            Today we help 3,000+ teams collect, manage, and resolve website feedback — from QA engineers to product managers to client stakeholders — all in one place, with the technical context developers actually need.
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-orange-50 rounded-3xl p-8 border border-purple-100">
          <div className="grid grid-cols-2 gap-6">
            {[
              { value: '3,000+', label: 'Teams worldwide' },
              { value: '3.8M+', label: 'Issues collected' },
              { value: '50%', label: 'Faster resolution' },
              { value: '2022', label: 'Founded' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold text-[#ff724f]">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">What drives us</p>
            <h2 className="text-3xl font-extrabold text-[#300a46]">Our values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  {v.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[#300a46] mb-1">{v.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="relative bg-[#1a0530] py-24 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#ff724f] opacity-10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-purple-500 opacity-10 blur-[120px] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-[#ff724f] rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-widest mb-6">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              The people
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Meet the team</h2>
            <p className="text-purple-300 text-lg max-w-xl mx-auto">The people behind ScaleFeedback — obsessed with making web feedback effortless.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TEAM.map(member => (
              <div key={member.name} className="group relative bg-white/5 border border-white/10 rounded-3xl p-8 text-center hover:bg-white/[0.08] hover:border-[#ff724f]/30 transition-all duration-300">
                {/* Photo */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ff724f] to-purple-600 opacity-20 scale-110 blur-md" />
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 group-hover:border-[#ff724f]/40 transition-colors duration-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                </div>
                {/* Info */}
                <p className="text-lg font-extrabold text-white mb-1">{member.name}</p>
                <p className="text-sm font-semibold text-[#ff724f] mb-4 uppercase tracking-wide">{member.role}</p>
                <div className="w-8 h-0.5 bg-[#ff724f]/40 mx-auto mb-4 rounded-full" />
                <p className="text-sm text-purple-300 leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#300a46] py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to squash some bugs?</h2>
          <p className="text-purple-300 mb-8">Join 3,000+ teams already using ScaleFeedback. Free for 15 days, no credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="bg-[#ff724f] hover:bg-[#e8623f] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-orange-900/30"
            >
              Start free trial
            </Link>
            <Link
              href="/contact"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base border border-white/20"
            >
              Talk to us →
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
