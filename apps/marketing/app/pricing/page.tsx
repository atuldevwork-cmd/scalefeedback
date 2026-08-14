'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';
import { appUrl } from '@/lib/app-url';

interface PlanFeature {
  label: string;
  popular?: boolean;
  comingSoon?: boolean;
}

const PLANS: {
  name: string;
  icon: string;
  desc: string;
  monthlyPrice: number;
  annualPrice: number;
  cta: string;
  ctaHref: string;
  highlight: boolean;
  badge: string | null;
  inheritsFrom: string | null;
  usage: string;
  features: PlanFeature[];
}[] = [
  {
    name: 'Starter',
    icon: 'lightbulb',
    desc: 'For freelancers and small teams.',
    monthlyPrice: 32,
    annualPrice: 29,
    cta: 'Start free trial',
    ctaHref: '/signup',
    highlight: false,
    badge: null,
    inheritsFrom: null,
    usage: '5 projects · 3 seats · 5 guests',
    features: [
      { label: 'Unlimited reporters & feedback' },
      { label: 'Website widget' },
      { label: 'Issue tracking & status' },
      { label: 'Comments & internal comments' },
      { label: 'Notifications' },
      { label: 'Screenshots & annotations' },
      { label: 'Environment details' },
      { label: 'Integrations (Jira, ClickUp, GitHub, Slack)' },
      { label: 'Email support' },
    ],
  },
  {
    name: 'Pro',
    icon: 'bolt',
    desc: 'For growing teams that need more power.',
    monthlyPrice: 59,
    annualPrice: 49,
    cta: 'Start free trial',
    ctaHref: '/signup',
    highlight: true,
    badge: 'Most Popular',
    inheritsFrom: 'Starter',
    usage: '25 projects · 15 seats · 20 guests',
    features: [
      { label: 'Console logs' },
      { label: 'Network requests' },
      { label: 'Admin roles' },
      { label: 'Session replay', popular: true },
      { label: 'Issue sync', popular: true },
      { label: 'Custom issue types', comingSoon: true },
      { label: 'Custom branding', comingSoon: true },
      { label: 'CSV export', comingSoon: true },
      { label: 'Feedback on Figma designs', comingSoon: true },
      { label: 'Feedback on PDFs', comingSoon: true },
      { label: 'Feedback on images', comingSoon: true },
    ],
  },
  {
    name: 'Agency',
    icon: 'business_center',
    desc: 'For agencies managing multiple clients.',
    monthlyPrice: 99,
    annualPrice: 79,
    cta: 'Start free trial',
    ctaHref: '/signup',
    highlight: false,
    badge: null,
    inheritsFrom: 'Pro',
    usage: 'Unlimited projects · 50 seats · 50 guests',
    features: [
      { label: 'Analytics', popular: true },
      { label: 'Priority support' },
      { label: 'SSO & SAML', comingSoon: true },
      { label: 'User groups', comingSoon: true },
      { label: 'Zendesk & Intercom integrations', comingSoon: true },
    ],
  },
];

const COMPARISON: { section: string; rows: { feature: string; values: (string | boolean)[] }[] }[] = [
  {
    section: 'Usage',
    rows: [
      { feature: 'Projects',   values: ['5',         '25',         'Unlimited']  },
      { feature: 'Reporters',  values: ['Unlimited', 'Unlimited',  'Unlimited']  },
      { feature: 'Users',      values: ['3',         '15',         '50']         },
      { feature: 'Guests',     values: ['5',         '20',         '50']         },
      { feature: 'Feedback',   values: ['Unlimited', 'Unlimited',  'Unlimited']  },
    ],
  },
  {
    section: 'Features',
    rows: [
      { feature: 'Website widget',            values: [true,  true,  true]  },
      { feature: 'Issue tracking & status',    values: [true,  true,  true]  },
      { feature: 'Comments',                   values: [true,  true,  true]  },
      { feature: 'Internal comments',          values: [true,  true,  true]  },
      { feature: 'Notifications',              values: [true,  true,  true]  },
      { feature: 'Screenshots & annotations',  values: [true,  true,  true]  },
      { feature: 'Environment details',        values: [true,  true,  true]  },
      { feature: 'Console logs',               values: [false, true,  true]  },
      { feature: 'Network requests',           values: [false, true,  true]  },
      { feature: 'Session replay',             values: [false, true,  true]  },
      { feature: 'Integrations',               values: [true,  true,  true]  },
      { feature: 'Issue sync',                 values: [false, true,  true]  },
      { feature: 'Admin roles',                values: [false, true,  true]  },
      { feature: 'Analytics',                  values: [false, false, true]  },
      { feature: 'Custom issue types',         values: [false, 'Coming soon', 'Coming soon']  },
      { feature: 'Custom branding',            values: [false, 'Coming soon', 'Coming soon']  },
      { feature: 'CSV export',                 values: [false, 'Coming soon', 'Coming soon']  },
      { feature: 'SSO & SAML',                 values: [false, false, 'Coming soon']  },
      { feature: 'User groups',                values: [false, false, 'Coming soon']  },
      { feature: 'Zendesk & Intercom integrations', values: [false, false, 'Coming soon']  },
      { feature: 'Feedback on Figma designs',  values: [false, 'Coming soon', 'Coming soon']  },
      { feature: 'Feedback on PDFs',            values: [false, 'Coming soon', 'Coming soon']  },
      { feature: 'Feedback on images',          values: [false, 'Coming soon', 'Coming soon']  },
    ],
  },
  {
    section: 'Support',
    rows: [
      { feature: 'Support', values: ['Email', 'Email', 'Priority'] },
    ],
  },
];

const FAQS = [
  {
    q: 'Do I need a credit card to start the free trial?',
    a: 'No. Your 15-day free trial starts immediately — no credit card, no commitment. You get full access to all features on your chosen plan during the trial.',
  },
  {
    q: 'What is the difference between a seat, a guest, and a reporter?',
    a: 'A seat is a team member with full dashboard access to manage, comment on, and resolve issues. A guest gets limited read and comment access — ideal for clients who need visibility. A reporter is anyone who submits feedback via the widget on your site — reporters are always unlimited and never consume a seat.',
  },
  {
    q: 'Which plan should I choose?',
    a: 'Starter ($29/mo) is great for freelancers and small teams with up to 5 projects and 3 seats. Pro ($49/mo) adds session replay, issue sync, and scales to 25 projects and 15 seats — the most popular choice for growing teams. Agency ($79/mo) is built for agencies managing multiple clients with unlimited projects, 50 seats, and advanced analytics.',
  },
  {
    q: 'What does "issue sync" mean?',
    a: 'Issue sync enables two-way integration with your tools. When you push a bug to Jira, ClickUp, or GitHub and it gets resolved there, the status automatically updates in Pinmarks too — no manual syncing needed. Available on Pro and Agency plans.',
  },
  {
    q: 'Can I upgrade or downgrade my plan later?',
    a: 'Yes, you can upgrade or downgrade at any time. Upgrades take effect immediately and are prorated. Downgrades take effect at the start of your next billing cycle.',
  },
  {
    q: 'What happens after my free trial ends?',
    a: 'After 15 days your account moves to a read-only state — all your data and feedback is preserved. Upgrade to any paid plan at any time to continue without losing anything.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel directly from your account settings at any time — no cancellation fees, no awkward phone calls. If you cancel an annual plan mid-cycle, the remaining period is not refunded but your access continues until the end of the billing period.',
  },
];

function CheckIcon() {
  return (
    <div className="w-6 h-6 rounded-full bg-[#ff724f]/15 flex items-center justify-center mx-auto">
      <svg className="w-3.5 h-3.5 text-[#ff724f]" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

function CrossIcon() {
  return (
    <div className="w-5 h-5 flex items-center justify-center mx-auto">
      <svg className="w-3 h-3 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans">
      <MarketingNavbar activePage="pricing" />

      {/* ── Header ── */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
        <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Pricing</p>
        <h1 className="text-4xl md:text-5xl font-black text-[#111111] mb-4 leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-slate-500 mb-8">
          Start free. Upgrade when you&apos;re ready.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!annual ? 'bg-white text-[#111111] shadow-sm' : 'text-slate-500'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-white text-[#111111] shadow-sm' : 'text-slate-500'}`}
          >
            Annual
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Save 25%</span>
          </button>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <p className="text-center text-sm text-slate-400 mb-8">
          All plans come with a 15-day free trial, no credit card required.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`h-full rounded-2xl border p-6 flex flex-col relative bg-white ${
                plan.highlight
                  ? 'border-2 border-[#ff724f] shadow-xl shadow-[#ff724f]/10'
                  : 'border-slate-200 shadow-sm'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-[#ff724f] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>auto_awesome</span>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                  plan.highlight ? 'bg-[#fff3f0]' : 'bg-slate-100'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, color: plan.highlight ? '#ff724f' : '#666666' }}
                >
                  {plan.icon}
                </span>
              </div>

              <div className="mb-5">
                <h2 className="text-base font-bold mb-1 text-[#111111]">
                  {plan.name}
                </h2>
                <p className="text-xs leading-relaxed text-slate-400">
                  {plan.desc}
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-[#111111]">
                    ${annual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-sm mb-1 text-slate-400">/mo</span>
                </div>
                <p className="text-xs mt-0.5 text-slate-400">
                  Billed ${plan.annualPrice * 12}/year
                </p>
              </div>

              <Link
                href={appUrl(plan.ctaHref)}
                className="w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all mb-6 bg-[#ff724f] hover:bg-[#e8603a] text-white"
              >
                {plan.cta}
              </Link>

              {/* Usage */}
              <p className="text-[11px] font-bold text-[#111111] uppercase tracking-wide mb-2">Usage</p>
              <ul className="space-y-2.5 mb-5">
                <li className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined shrink-0 mt-0.5" style={{ fontSize: 15, color: '#ff724f' }}>
                    check_circle
                  </span>
                  <span className="text-xs leading-snug text-slate-600">{plan.usage}</span>
                </li>
              </ul>

              {/* Features */}
              <p className="text-[11px] font-bold text-[#111111] uppercase tracking-wide mb-2">
                {plan.inheritsFrom ? `Everything in ${plan.inheritsFrom}, plus` : 'Features'}
              </p>
              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    <span
                      className="material-symbols-outlined shrink-0 mt-0.5"
                      style={{ fontSize: 15, color: f.comingSoon ? '#B0B0B0' : '#ff724f' }}
                    >
                      {f.comingSoon ? 'schedule' : 'check_circle'}
                    </span>
                    <span className="flex-1 flex items-center flex-wrap gap-1.5">
                      <span className={`text-xs leading-snug ${f.comingSoon ? 'text-slate-400' : 'text-slate-600'}`}>
                        {f.label}
                      </span>
                      {f.popular && (
                        <span className="shrink-0 text-[10px] font-bold text-[#ff724f] bg-[#fff3f0] border border-[#ff724f]/20 px-2 py-0.5 rounded-full tracking-wide">
                          Popular
                        </span>
                      )}
                      {f.comingSoon && (
                        <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full tracking-wide">
                          Coming soon
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-[#111111]">Compare all features</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-4 border-b border-gray-200">
            <div className="px-5 py-4 bg-[#F9F9F9] text-xs font-bold text-[#111111] uppercase tracking-widest flex items-end">
              Feature
            </div>
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                className={`px-3 py-4 text-center ${i === 1 ? 'bg-[#fff3f0]' : 'bg-[#F9F9F9]'}`}
              >
                <p className="text-sm font-black text-[#111111]">{plan.name}</p>
                <p className={`text-xs mt-0.5 font-semibold ${i === 1 ? 'text-[#ff724f]' : 'text-slate-400'}`}>
                  ${annual ? plan.annualPrice : plan.monthlyPrice}/mo
                </p>
              </div>
            ))}
          </div>

          {/* Sections */}
          {COMPARISON.map((group) => (
            <div key={group.section}>
              {/* Section divider */}
              <div className="grid grid-cols-4 bg-[#F3F3F1] border-b border-gray-200">
                <div className="col-span-4 px-5 py-2.5 text-[11px] font-bold text-[#666666] uppercase tracking-widest">
                  {group.section}
                </div>
              </div>

              {group.rows.map((row, ri) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-4 border-b border-gray-100 last:border-b-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                >
                  <div className="px-5 py-3.5 text-sm text-[#333333] font-medium flex items-center">
                    {row.feature}
                  </div>
                  {row.values.map((val, vi) => (
                    <div
                      key={vi}
                      className={`px-3 py-3.5 flex items-center justify-center ${vi === 1 ? 'bg-[#ff724f]/5' : ''}`}
                    >
                      {val === true ? (
                        <CheckIcon />
                      ) : val === false ? (
                        <CrossIcon />
                      ) : val === 'Coming soon' ? (
                        <span className="text-[11px] font-semibold text-slate-400 italic flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                          Soon
                        </span>
                      ) : (
                        <span className={`text-sm font-semibold ${vi === 1 ? 'text-[#ff724f]' : 'text-[#555555]'}`}>
                          {val}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-3xl font-black text-[#111111]">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group bg-[#F5F5F2] rounded-2xl overflow-hidden">
              <summary className="flex items-center justify-between px-7 py-6 cursor-pointer list-none text-[#111111] font-bold text-lg gap-6">
                <span className="leading-snug">{faq.q}</span>
                <span className="material-symbols-outlined text-gray-400 shrink-0 text-[22px] transition-transform duration-200 group-open:rotate-180 group-open:text-[#ff724f]">
                  expand_more
                </span>
              </summary>
              <div className="px-7 pb-7 text-[#555555] leading-relaxed text-base border-t border-black/5 pt-5">
                {faq.a}
              </div>
            </details>
          ))}
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
            Ship better websites.<br />
            <span className="text-[#ff724f]">Start today.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Join thousands of teams already using Pinmarks to collect visual feedback and resolve bugs faster.
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
