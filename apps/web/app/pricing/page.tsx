'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';

const PLANS = [
  {
    name: 'Starter',
    desc: 'Perfect for freelancers and small projects.',
    monthlyPrice: 39,
    annualPrice: 29,
    cta: 'Start free trial',
    ctaHref: '/signup',
    highlight: false,
    badge: null,
    features: [
      '3 team seats',
      '1 active website',
      '10 guest reporters',
      '5,000 monthly page views',
      'Unlimited feedback & reporters',
      'Screenshots & annotations',
      'Browser & OS context',
      'Basic integrations (Slack, GitHub)',
      'Comment threads',
      'Email notifications',
    ],
  },
  {
    name: 'Team',
    desc: 'For growing teams that need more power.',
    monthlyPrice: 149,
    annualPrice: 99,
    cta: 'Start free trial',
    ctaHref: '/signup',
    highlight: true,
    badge: 'Most Popular',
    features: [
      '15 team seats',
      '3 active websites',
      '50 guest reporters',
      '25,000 monthly page views',
      'Everything in Starter',
      'Jira & ClickUp integrations',
      'Two-way issue sync',
      'Session replay',
      'Developer tools (console, network)',
      'Custom metadata',
      'Custom branding',
      'CSV export',
      'Priority support',
    ],
  },
  {
    name: 'Business',
    desc: 'Custom solutions for large organizations.',
    monthlyPrice: null,
    annualPrice: null,
    cta: 'Talk to sales',
    ctaHref: 'mailto:hello@scalefeedback.io',
    highlight: false,
    badge: null,
    features: [
      'Unlimited team seats',
      'Unlimited websites',
      'Unlimited guests',
      'Everything in Team',
      'SSO / SAML',
      'Audit logs',
      'Data masking',
      'Advanced analytics',
      'Webhooks',
      'Admin roles & permissions',
      'Zendesk & Intercom integrations',
      'Dedicated account manager',
      'SLA & uptime guarantee',
    ],
  },
];

const FAQS = [
  {
    q: 'What is a seat?',
    a: 'A seat is a member of your team who can access the ScaleFeedback dashboard to manage and respond to feedback. Guests (clients, end-users) who submit feedback via the widget do not consume a seat.',
  },
  {
    q: 'Do I need a credit card to start?',
    a: 'No. Your 15-day free trial starts immediately with no credit card required. You only enter payment details when you decide to continue.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and are prorated.',
  },
  {
    q: 'What happens after my free trial?',
    a: 'After 15 days, your account moves to a read-only state. You can then choose a plan to continue collecting feedback, or export your data.',
  },
  {
    q: 'Is annual billing required?',
    a: 'No, monthly billing is available on all plans. Annual billing gives you up to 33% off compared to the monthly rate.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel your subscription at any time from your account settings. There are no cancellation fees.',
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      <MarketingNavbar activePage="pricing" />

      {/* ── Header ── */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
        <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Pricing</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#300a46] mb-4 leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-slate-500 mb-8">
          Start free for 15 days. No credit card required.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!annual ? 'bg-white text-[#300a46] shadow-sm' : 'text-slate-500'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-white text-[#300a46] shadow-sm' : 'text-slate-500'}`}
          >
            Annual
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Save 33%</span>
          </button>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-7 flex flex-col relative ${
                plan.highlight
                  ? 'bg-[#300a46] border-[#300a46] shadow-2xl shadow-purple-200 scale-[1.02]'
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

              <div className="mb-6">
                <h2 className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-[#300a46]'}`}>
                  {plan.name}
                </h2>
                <p className={`text-sm ${plan.highlight ? 'text-purple-300' : 'text-slate-400'}`}>
                  {plan.desc}
                </p>
              </div>

              <div className="mb-6">
                {plan.monthlyPrice ? (
                  <>
                    <div className="flex items-end gap-1">
                      <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-[#300a46]'}`}>
                        ${annual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-purple-300' : 'text-slate-400'}`}>/mo</span>
                    </div>
                    {annual && (
                      <p className={`text-xs mt-1 ${plan.highlight ? 'text-purple-400' : 'text-slate-400'}`}>
                        Billed ${(plan.annualPrice! * 12).toLocaleString()}/year
                        <span className="ml-1 line-through opacity-60">${plan.monthlyPrice * 12}/year</span>
                      </p>
                    )}
                  </>
                ) : (
                  <div className={`text-3xl font-extrabold ${plan.highlight ? 'text-white' : 'text-[#300a46]'}`}>
                    Custom
                  </div>
                )}
              </div>

              <Link
                href={plan.ctaHref}
                className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-all mb-7 ${
                  plan.highlight
                    ? 'bg-[#ff724f] hover:bg-[#e8623f] text-white shadow-lg shadow-orange-900/30'
                    : plan.name === 'Business'
                    ? 'bg-[#300a46] hover:bg-[#4a1266] text-white'
                    : 'border-2 border-[#300a46] text-[#300a46] hover:bg-[#300a46] hover:text-white'
                }`}
              >
                {plan.cta}
              </Link>

              <div className={`border-t pt-6 ${plan.highlight ? 'border-purple-700' : 'border-slate-100'}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${plan.highlight ? 'text-purple-300' : 'text-slate-400'}`}>
                  What&apos;s included
                </p>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span
                        className="material-symbols-outlined shrink-0 mt-0.5"
                        style={{ fontSize: 16, color: plan.highlight ? '#ff724f' : '#ff724f' }}
                      >
                        check_circle
                      </span>
                      <span className={`text-sm leading-snug ${plan.highlight ? 'text-purple-100' : 'text-slate-600'}`}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Agency callout */}
        <div className="mt-16 bg-orange-50 border border-orange-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[#ff724f]" style={{ fontSize: 20 }}>business_center</span>
              <span className="font-bold text-[#300a46]">Agency Plan</span>
              <span className="text-xs bg-[#ff724f] text-white px-2 py-0.5 rounded-full font-medium">Special offer</span>
            </div>
            <p className="text-sm text-slate-500">15 members · 50 websites · 50 guests — built for small digital agencies.</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-2xl font-extrabold text-[#300a46]">${annual ? 99 : 129}<span className="text-sm font-normal text-slate-400">/mo</span></p>
            </div>
            <Link href="/signup" className="bg-[#300a46] hover:bg-[#4a1266] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
              Apply now
            </Link>
          </div>
        </div>
      </section>

      {/* ── Free trial banner ── */}
      <section className="bg-gradient-to-br from-[#300A46] to-[#2D1B69] py-14">
        <div className="max-w-2xl mx-auto px-6 text-center text-white">
          <span className="material-symbols-outlined text-[#ff724f] mb-3 block" style={{ fontSize: 36 }}>
            rocket_launch
          </span>
          <h2 className="text-3xl font-extrabold mb-3">Try ScaleFeedback free for 15 days</h2>
          <p className="text-purple-300 mb-8">No credit card required. Full access to all Team features during your trial.</p>
          <Link
            href="/signup"
            className="inline-block bg-[#ff724f] hover:bg-[#e8623f] text-white font-bold px-8 py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-orange-900/30"
          >
            Start free trial
          </Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-3xl font-extrabold text-[#300a46]">Frequently asked questions</h2>
        </div>
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <div
              key={faq.q}
              className={`border rounded-xl transition-colors ${openFaq === i ? 'border-orange-300' : 'border-slate-200 hover:border-orange-200'}`}
            >
              <button
                className="w-full flex items-center gap-3 p-5 text-left"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="material-symbols-outlined text-[#ff724f] shrink-0" style={{ fontSize: 18 }}>
                  help
                </span>
                <p className="font-semibold text-[#300a46] text-sm flex-1">{faq.q}</p>
                <span className="material-symbols-outlined text-slate-400 shrink-0 transition-transform" style={{ fontSize: 20, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  expand_more
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 pl-11">
                  <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-slate-500 text-sm">
            Still have questions?{' '}
            <Link href="/contact" className="text-[#ff724f] font-semibold hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
