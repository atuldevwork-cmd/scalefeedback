'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LIVE_INTEGRATIONS, CMS_PLATFORMS_COMING_SOON } from '@/lib/cms-plugins';
import { DocsSidebar } from '../docs-sidebar';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.pinmarks.io';
const WIDGET_URL = `${APP_URL}/widget.js`;

/* ── Snippets ─────────────────────────────────────────────────────────── */

const htmlSnippet = (apiKey: string) =>
`<!-- Pinmarks Widget -->
<script src="${WIDGET_URL}" data-project="${apiKey}" async></script>`;

const reactSnippet = (apiKey: string) =>
`// src/components/PinmarksWidget.tsx
import { useEffect } from 'react';

export function PinmarksWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${WIDGET_URL}';
    script.dataset.project = '${apiKey}';
    script.async = true;
    document.body.appendChild(script);

    return () => { document.body.removeChild(script); };
  }, []);

  return null;
}

// Add to your root App component:
// <PinmarksWidget />`;

const nextjsSnippet = (apiKey: string) =>
`// app/layout.tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="${WIDGET_URL}"
          data-project="${apiKey}"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}`;

const vueSnippet = (apiKey: string) =>
`// main.ts (or App.vue mounted hook)
const script = document.createElement('script');
script.src = '${WIDGET_URL}';
script.dataset.project = '${apiKey}';
script.async = true;
document.body.appendChild(script);`;

const sdkSnippet =
`// Open the widget programmatically
Pinmarks.open();

// Pre-identify the reporter (hides name/email fields in the form)
Pinmarks.setUser({ name: 'Jane Smith', email: 'jane@acme.com' });
// Clear the user (shows guest fields again)
Pinmarks.setUser(null);

// Pre-identify via window config (set BEFORE the widget script loads)
window.PinmarksConfig = {
  user: { name: 'Jane Smith', email: 'jane@acme.com' },
  // OR use individual fields:
  reporterName: 'Jane Smith',
  reporterEmail: 'jane@acme.com',
};

// Keyboard shortcut: Cmd+I (Mac) / Ctrl+I (Windows) also opens the widget`;

const CONFIG_ITEMS = [
  { opt: 'data-project *', type: 'HTML attribute', def: '—', desc: 'Required. Your project API key, set on the <script> tag.' },
  { opt: 'color', type: 'string', def: '#7C3AED', desc: 'Accent color for the widget button and UI. Overridden by dashboard settings.' },
  { opt: 'position', type: '"bottom-right" | "bottom-left" | "middle-right" | "middle-left"', def: '"middle-right"', desc: 'Where the feedback button appears on screen. Overridden by dashboard settings.' },
  { opt: 'buttonText', type: 'string', def: '"Report issue"', desc: 'Label on the feedback button (data-text attribute on script tag).' },
  { opt: 'collectConsole', type: 'boolean', def: 'true', desc: 'Capture browser console logs with each report.' },
  { opt: 'collectNetwork', type: 'boolean', def: 'false', desc: 'Capture failed XHR / fetch requests (4xx / 5xx only).' },
  { opt: 'guestReporting', type: 'boolean', def: 'true', desc: 'Show name & email fields for anonymous users.' },
  { opt: 'user', type: '{ name, email }', def: '—', desc: 'Pre-identify the reporter via window.PinmarksConfig.user or Pinmarks.setUser(). Hides name/email fields.' },
];

const TROUBLESHOOTING_ITEMS = [
  {
    q: 'The widget button is not showing',
    a: 'Ensure the script tag has a valid data-project attribute and is placed before the closing </body> tag. Check the browser console for [Pinmarks] errors.',
  },
  {
    q: 'Screenshots are blank or incomplete',
    a: 'The widget captures screenshots via a fallback chain: the Pinmarks browser extension (if installed), then a server-side render, then a client-side DOM reconstruction (html2canvas) as a last resort. Cross-origin iframes and some CSS features (backdrop-filter) may not render correctly in the html2canvas fallback. Ensure your site allows same-origin canvas access.',
  },
  {
    q: 'Widget does not appear in production but works locally',
    a: 'Check that your Content Security Policy (CSP) allows scripts from the Pinmarks domain. You may need to add it to script-src and connect-src.',
  },
  {
    q: 'Console / network logs are empty',
    a: 'Set collectConsole: true and collectNetwork: true in your config. Network capture only records failed requests (4xx / 5xx).',
  },
  {
    q: 'Submissions are not appearing in the dashboard',
    a: 'Verify the data-project value matches your API key exactly. Check the Network tab for a POST to /api/feedback — any 4xx response means the key is wrong or the project is inactive.',
  },
];

/* ── Reusable components ──────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1"
    >
      <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="bg-gray-950 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <span className="text-xs text-gray-400 font-mono">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm text-gray-200 overflow-x-auto font-mono leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
}

function SectionBadge({ n }: { n: number }) {
  return (
    <div className="w-7 h-7 rounded-full bg-[#ff724f] text-white text-sm font-bold flex items-center justify-center shrink-0">{n}</div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function DocsPage() {
  const [apiKey] = useState('proj_your_api_key_here');
  const [framework, setFramework] = useState<'html' | 'react' | 'nextjs' | 'vue'>('html');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [openConfig, setOpenConfig] = useState<string | null>(null);

  const frameworkSnippet = {
    html: htmlSnippet(apiKey),
    react: reactSnippet(apiKey),
    nextjs: nextjsSnippet(apiKey),
    vue: vueSnippet(apiKey),
  }[framework];

  const frameworkLabel = { html: 'HTML', react: 'JSX', nextjs: 'TSX', vue: 'TypeScript' }[framework];

  return (
    <div className="flex min-h-screen">
      <DocsSidebar />

      {/* ── Content ── */}
      <div className="flex-1 px-6 lg:px-10 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Widget Documentation</h1>
        <p className="text-muted-foreground mb-10">Embed the Pinmarks widget on any site in under 2 minutes.</p>

        <div className="space-y-14">

          {/* ── Website Monitoring ── */}
          <section id="website-monitoring">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px]">radar</span>
              Website Monitoring
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#fff3f0] text-[#ff724f]">New</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Scan your site for accessibility issues without waiting for a reporter to find them. Open a project&apos;s
              <strong className="text-foreground"> Monitor</strong> tab, give it a list of URLs (or a sitemap), and run a scan on demand.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                { icon: 'travel_explore', title: 'Scan any page list', desc: 'Paste individual URLs or a sitemap — exclude pages you don’t care about.' },
                { icon: 'accessibility_new', title: 'WCAG accessibility checks', desc: 'Missing alt text, low color contrast, missing ARIA attributes, and missing skip-to-content links.' },
                { icon: 'photo_camera', title: 'Screenshotted issues', desc: 'Every issue is captured with a screenshot of the broken element plus a plain-English fix.' },
                { icon: 'content_copy', title: 'Automatic grouping', desc: 'The same issue found on multiple pages is grouped once, not duplicated per page.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="border border-border rounded-xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#ff724f] text-[20px] shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">construction</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Scans are on-demand for now</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  Scheduled (weekly / monthly) automatic re-scans are coming soon. For now, rescan a project any time from its Monitor tab.
                </p>
              </div>
            </div>
          </section>

          {/* ── Quick start ── */}
          <section id="quickstart">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px]">rocket_launch</span>
              Quick start
            </h2>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {[
                <>Go to <strong className="text-foreground">Projects</strong> → open your project → copy the snippet from <strong className="text-foreground">Settings → Widget Installation</strong>.</>,
                <>Paste the snippet before the closing <code className="bg-muted px-1 rounded text-xs">&lt;/body&gt;</code> tag of your site.</>,
                <>Reload your site — a <strong className="text-[#ff724f]">Report issue</strong> button appears on your page.</>,
                <>Submit a test report. It appears instantly in your Pinmarks dashboard.</>,
                <>Use <code className="bg-muted px-1 rounded text-xs">Cmd+I</code> (Mac) or <code className="bg-muted px-1 rounded text-xs">Ctrl+I</code> (Windows) as a keyboard shortcut to open the widget anytime.</>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-[#ff724f]/10 text-[#ff724f] font-bold text-xs flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Installation ── */}
          <section id="install">
            <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px]">integration_instructions</span>
              Installation
            </h2>

            {/* Step 1 — snippet */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <SectionBadge n={1} />
                <h3 className="font-medium text-foreground">Add to your site</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Copy your Snippet code from <strong className="text-foreground">Projects → Settings → Widget Installation
                </strong>, then paste the snippet before the closing <code className="bg-muted px-1 rounded text-xs">&lt;/body&gt;</code> tag.
              </p>

              {/* Framework tabs */}
              <div className="flex gap-1 mb-3 bg-muted rounded-lg p-1 w-fit flex-wrap">
                {(['html', 'react', 'nextjs', 'vue'] as const).map((fw) => (
                  <button
                    key={fw}
                    onClick={() => setFramework(fw)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      framework === fw ? 'bg-white text-[#111111] shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {fw === 'html' ? 'HTML' : fw === 'react' ? 'React' : fw === 'nextjs' ? 'Next.js' : 'Vue'}
                  </button>
                ))}
              </div>

              <CodeBlock lang={frameworkLabel} code={frameworkSnippet} />

              {framework === 'nextjs' && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#ff724f]">info</span>
                  Uses Next.js <code className="bg-muted px-1 rounded">next/script</code> for optimal loading.
                </p>
              )}

            </div>
          </section>

          {/* ── CMS plugins ── */}
          <section id="cms">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px]">extension</span>
              CMS plugins
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Available now — no plugin needed, just paste the snippet into these tools&apos; existing custom code fields.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {LIVE_INTEGRATIONS.map(({ id, name, abbr }) => (
                <Link
                  key={id}
                  href={`/docs/${id}`}
                  className="text-left border border-border rounded-xl p-4 flex items-center gap-3 transition-colors hover:border-[#ff724f]/40"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                    {abbr}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{name}</p>
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      Available
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl mb-5">
              <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">construction</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Native CMS plugins — coming soon</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  Native integrations for these platforms are under development. Use the Installation snippet above in the meantime.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pointer-events-none select-none">
              {CMS_PLATFORMS_COMING_SOON.map(({ name, abbr }) => (
                <div key={name} className="border border-border rounded-xl p-4 flex items-center gap-3 cursor-not-allowed">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                    {abbr}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{name}</p>
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#ff724f]/10 text-[#ff724f] font-medium">
                      Coming soon
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── SDK ── */}
          <section id="sdk">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px]">code</span>
              SDK
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Trigger the widget programmatically or prefill user data.
            </p>
            <CodeBlock lang="JavaScript" code={sdkSnippet} />

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { method: 'Pinmarks.open()', desc: 'Opens the widget panel' },
                { method: 'Pinmarks.setUser(user)', desc: 'Pre-identify the reporter; pass null to clear' },
              ].map(({ method, desc }) => (
                <div key={method} className="bg-card border border-border rounded-xl p-4">
                  <p className="font-mono text-xs text-[#ff724f] mb-1">{method}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Config reference ── */}
          <section id="config">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px]">tune</span>
              Configuration reference
            </h2>
            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              {CONFIG_ITEMS.map(({ opt, type, def, desc }) => {
                const isOpen = openConfig === opt;
                return (
                  <div key={opt}>
                    <button
                      onClick={() => setOpenConfig(isOpen ? null : opt)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-[#ff724f] whitespace-nowrap">{opt}</span>
                        <span className="font-mono text-[11px] text-gray-500 truncate hidden sm:inline">{type}</span>
                        <span className="font-mono text-[11px] text-gray-400 whitespace-nowrap">{def}</span>
                      </div>
                      <span className={`material-symbols-outlined text-[18px] text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 space-y-1">
                        <p className="text-xs text-muted-foreground sm:hidden">Type: <span className="font-mono">{type}</span></p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Troubleshooting ── */}
          <section id="troubleshooting">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px]">build</span>
              Troubleshooting
            </h2>
            <div className="space-y-3">
              {TROUBLESHOOTING_ITEMS.map(({ q, a }) => {
                const isOpen = openFaq === q;
                return (
                  <div key={q} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : q)}
                      className="w-full flex items-center justify-between gap-3 p-5 text-left"
                    >
                      <span className="font-semibold text-foreground text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff724f] text-[16px]">help</span>
                        {q}
                      </span>
                      <span className={`material-symbols-outlined text-[20px] text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <p className="text-sm text-muted-foreground leading-relaxed px-5 pb-5 pl-[3.25rem]">{a}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 bg-muted/50 border border-border rounded-xl p-5 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px] shrink-0">support_agent</span>
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">Still stuck?</p>
                <p className="text-sm text-muted-foreground">
                  Email us at{' '}
                  <a href="mailto:hello@pinmarks.io" className="text-[#ff724f] hover:underline font-medium">
                    hello@pinmarks.io
                  </a>{' '}
                  and we&apos;ll get back to you within one business day.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
