'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';

const PLANS = [
  {
    name: 'Starter',
    desc: 'For freelancers and small teams.',
    monthlyPrice: 12,
    annualPrice: 9,
    cta: 'Start free trial',
    ctaHref: '/signup',
    highlight: false,
    badge: null,
    features: [
      '5 projects · 3 seats · 5 guests',
      'Unlimited reporters & feedback',
      'Website widget',
      'Issue tracking & status',
      'Comments & internal comments',
      'Notifications',
      'Screenshots & annotations',
      'Environment details & console logs',
      'Integrations (Jira, ClickUp, GitHub, Slack)',
      'Admin roles',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    desc: 'For growing teams that need more power.',
    monthlyPrice: 39,
    annualPrice: 29,
    cta: 'Start free trial',
    ctaHref: '/signup',
    highlight: true,
    badge: 'Most Popular',
    features: [
      '25 projects · 15 seats · 20 guests',
      'Unlimited reporters & feedback',
      'Website widget',
      'Issue tracking & status',
      'Comments & internal comments',
      'Notifications',
      'Screenshots & annotations',
      'Environment details & console logs',
      'Integrations (Jira, ClickUp, GitHub, Slack)',
      'Admin roles',
      'Session replay',
      'Issue sync',
      'Email support',
    ],
  },
  {
    name: 'Agency',
    desc: 'For agencies managing multiple clients.',
    monthlyPrice: 79,
    annualPrice: 59,
    cta: 'Start free trial',
    ctaHref: '/signup',
    highlight: false,
    badge: null,
    features: [
      'Unlimited projects · 50 seats · 50 guests',
      'Unlimited reporters & feedback',
      'Website widget',
      'Issue tracking & status',
      'Comments & internal comments',
      'Notifications',
      'Screenshots & annotations',
      'Environment details & console logs',
      'Integrations (Jira, ClickUp, GitHub, Slack)',
      'Admin roles',
      'Session replay',
      'Issue sync',
      'Analytics',
      'Priority support',
    ],
  },
];

const COMPARISON = [
  { feature: 'Projects',                values: ['5',         '25',         'Unlimited']  },
  { feature: 'Reporters',              values: ['Unlimited', 'Unlimited',  'Unlimited']  },
  { feature: 'Users',                   values: ['3',         '15',         '50']         },
  { feature: 'Guests',                  values: ['5',         '20',         '50']         },
  { feature: 'Feedback',                values: ['Unlimited', 'Unlimited',  'Unlimited']  },
  { feature: 'Website widget',           values: [true,        true,         true]         },
  { feature: 'Issue tracking & status', values: [true,        true,         true]         },
  { feature: 'Comments',               values: [true,        true,         true]         },
  { feature: 'Internal comments',      values: [true,        true,         true]         },
  { feature: 'Notifications',          values: [true,        true,         true]         },
  { feature: 'Screenshots & annotations', values: [true,      true,         true]         },
  { feature: 'Environment details',     values: [true,        true,         true]         },
  { feature: 'Console logs',            values: [true,        true,         true]         },
  { feature: 'Session replay',          values: [false,       true,         true]         },
  { feature: 'Integrations',            values: [true,        true,         true]         },
  { feature: 'Issue sync',              values: [false,       true,         true]         },
  { feature: 'Admin roles',              values: [true,        true,         true]         },
  { feature: 'Analytics',               values: [false,       false,        true]         },
  { feature: 'Support',                 values: ['Email',     'Email',      'Priority']   },
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
    a: 'Starter ($9/mo) is great for freelancers and small teams with up to 5 projects and 3 seats. Pro ($29/mo) adds session replay, issue sync, and scales to 25 projects and 15 seats — the most popular choice for growing teams. Agency ($59/mo) is built for agencies managing multiple clients with unlimited projects, 50 seats, and advanced analytics.',
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col relative ${
                plan.highlight
                  ? 'bg-[#111111] border-[#111111] shadow-2xl shadow-black/20 lg:scale-[1.04] lg:-translate-y-1'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#ff724f] text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className={`text-base font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-[#111111]'}`}>
                  {plan.name}
                </h2>
                <p className={`text-xs leading-relaxed ${plan.highlight ? 'text-gray-400' : 'text-slate-400'}`}>
                  {plan.desc}
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-end gap-1">
                  <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-[#111111]'}`}>
                    ${annual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className={`text-sm mb-1 ${plan.highlight ? 'text-gray-400' : 'text-slate-400'}`}>/mo</span>
                </div>
                {annual && plan.annualPrice > 0 && (
                  <p className={`text-xs mt-0.5 ${plan.highlight ? 'text-gray-500' : 'text-slate-400'}`}>
                    Billed ${plan.annualPrice * 12}/year
                  </p>
                )}
                {plan.annualPrice === 0 && (
                  <p className={`text-xs mt-0.5 ${plan.highlight ? 'text-gray-500' : 'text-slate-400'}`}>
                    Free forever
                  </p>
                )}
              </div>

              <Link
                href={plan.ctaHref}
                className={`w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all mb-6 ${
                  plan.highlight
                    ? 'bg-[#ff724f] hover:bg-[#e8603a] text-white'
                    : plan.name === 'Free'
                    ? 'border border-slate-200 text-[#111111] hover:bg-slate-50'
                    : 'bg-[#111111] hover:bg-[#333333] text-white'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span
                      className="material-symbols-outlined shrink-0 mt-0.5"
                      style={{ fontSize: 15, color: plan.highlight ? '#ff724f' : '#ff724f' }}
                    >
                      check_circle
                    </span>
                    <span className={`text-xs leading-snug ${plan.highlight ? 'text-gray-300' : 'text-slate-600'}`}>
                      {f}
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
                className={`px-3 py-4 text-center ${i === 1 ? 'bg-[#111111]' : 'bg-[#F9F9F9]'}`}
              >
                <p className={`text-sm font-black ${i === 1 ? 'text-white' : 'text-[#111111]'}`}>{plan.name}</p>
                <p className={`text-xs mt-0.5 font-semibold ${i === 1 ? 'text-[#ff724f]' : 'text-slate-400'}`}>
                  ${annual ? plan.annualPrice : plan.monthlyPrice}/mo
                </p>
              </div>
            ))}
          </div>

          {/* Rows */}
          {COMPARISON.map((row, ri) => (
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
