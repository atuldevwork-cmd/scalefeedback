'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';

const TOPICS = [
  'General Inquiry',
  'Technical Support',
  'Billing & Plans',
  'Feature Request',
  'Bug Report',
  'Partnership',
  'Other',
];

const CONTACT_ITEMS = [
  {
    icon: 'mail',
    label: 'Email us',
    value: 'hello@scalefeedback.io',
    href: 'mailto:hello@scalefeedback.io',
    desc: 'We reply within 24 hours on business days.',
  },
  {
    icon: 'chat',
    label: 'Live chat',
    value: 'Start a chat',
    href: null,
    desc: 'Click the chat bubble in the bottom-right corner.',
  },
  {
    icon: 'schedule',
    label: 'Business hours',
    value: 'Mon – Fri, 9 AM – 6 PM IST',
    href: null,
    desc: 'We are based in India (UTC +5:30).',
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNavbar activePage="contact" />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#fff3f0] to-white pt-16 pb-12 text-center px-4">
        <span className="inline-block text-[11px] font-semibold tracking-widest text-[#ff724f] uppercase mb-4">Contact Us</span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#111111] mb-4 leading-tight">
          We'd love to hear<br className="hidden sm:block" /> from you
        </h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto">
          Have a question, idea, or just want to say hi? Fill in the form and we'll get back to you shortly.
        </p>
      </section>

      {/* Main content */}
      <section className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 grid md:grid-cols-[1fr_380px] gap-12">

        {/* Form */}
        <div>
          {status === 'sent' ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 gap-5">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-[32px]">check_circle</span>
              </div>
              <h2 className="text-2xl font-bold text-[#111111]">Message sent!</h2>
              <p className="text-slate-500 max-w-sm">
                Thanks for reaching out. We'll get back to you at <strong>{form.email}</strong> within one business day.
              </p>
              <button
                onClick={() => { setForm({ name: '', email: '', topic: '', subject: '', message: '' }); setStatus('idle'); }}
                className="mt-2 text-sm text-[#ff724f] hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1.5">Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set('name')}
                    required
                    placeholder="Your full name"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1.5">Email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    required
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">Topic</label>
                <select
                  value={form.topic}
                  onChange={set('topic')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] bg-white text-slate-700"
                >
                  <option value="">Select a topic…</option>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={set('subject')}
                  placeholder="Brief description of your inquiry"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">Message <span className="text-red-400">*</span></label>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  required
                  rows={6}
                  placeholder="Tell us what's on your mind…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] resize-none"
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-500">Something went wrong. Please try again or email us directly.</p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full bg-[#111111] hover:bg-[#333333] text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>

        {/* Contact info sidebar */}
        <div className="space-y-6">
          <div className="bg-[#F9F9F9] rounded-2xl p-6 border border-gray-100">
            <h2 className="text-base font-semibold text-[#111111] mb-5">Other ways to reach us</h2>
            <div className="space-y-5">
              {CONTACT_ITEMS.map((item) => (
                <div key={item.label} className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#111111]/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#111111] text-[18px]">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="text-sm font-medium text-[#ff724f] hover:underline">{item.value}</a>
                    ) : (
                      <p className="text-sm font-medium text-[#111111]">{item.value}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#fff3f0] rounded-2xl p-6 border border-yellow-200">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#ff724f] text-[22px] shrink-0 mt-0.5">rocket_launch</span>
              <div>
                <p className="text-sm font-semibold text-[#111111] mb-1">Ready to get started?</p>
                <p className="text-xs text-slate-500 mb-3">Sign up free and start collecting feedback in minutes — no credit card required.</p>
                <Link href="/signup" className="inline-block bg-[#ff724f] hover:bg-[#e8603a] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                  Start free trial →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
