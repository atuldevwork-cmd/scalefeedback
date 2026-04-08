'use client';

import { useState } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.scalefeedback.io';
const WIDGET_URL = `${APP_URL}/widget.js`;

/* ── Snippets ─────────────────────────────────────────────────────────── */

const htmlSnippet = (apiKey: string) =>
`<!-- ScaleFeedback Widget -->
<script src="${WIDGET_URL}" data-project="${apiKey}" async></script>`;

const reactSnippet = (apiKey: string) =>
`// src/components/ScaleFeedbackWidget.tsx
import { useEffect } from 'react';

export function ScaleFeedbackWidget() {
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
// <ScaleFeedbackWidget />`;

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
ScaleFeedback.open();

// Close it
ScaleFeedback.close();

// Optional: advanced config via window object
// (set BEFORE the widget script loads)
window.ScaleFeedbackConfig = {
  reporterName: 'Jane Smith',   // prefill from your auth
  reporterEmail: 'jane@acme.com',
  color: '#ff724f',             // override accent color
  position: 'left',             // 'right' (default) | 'left'
  collectConsole: true,
  collectNetwork: true,

  // Event hooks
  onOpen:   () => console.log('Widget opened'),
  onClose:  () => console.log('Widget closed'),
  onSubmit: (fb) => console.log('Submitted:', fb),
};`;

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

/* ── Sidebar nav sections ─────────────────────────────────────────────── */

const SECTIONS = [
  { id: 'quickstart', label: 'Quick start' },
  { id: 'install', label: 'Installation' },
  { id: 'sdk', label: 'SDK & Hooks' },
  { id: 'config', label: 'Config reference' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
];

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function DocsPage() {
  const [apiKey] = useState('proj_your_api_key_here');
  const [framework, setFramework] = useState<'html' | 'react' | 'nextjs' | 'vue'>('html');
  const [active, setActive] = useState('quickstart');

  const frameworkSnippet = {
    html: htmlSnippet(apiKey),
    react: reactSnippet(apiKey),
    nextjs: nextjsSnippet(apiKey),
    vue: vueSnippet(apiKey),
  }[framework];

  const frameworkLabel = { html: 'HTML', react: 'JSX', nextjs: 'TSX', vue: 'TypeScript' }[framework];

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="w-52 shrink-0 border-r border-border bg-muted/30 py-8 px-4 sticky top-0 h-screen hidden lg:block">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 px-2">On this page</p>
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActive(s.id);
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                active === s.id
                  ? 'bg-[#fff3f0] text-[#ff724f] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Content ── */}
      <div className="flex-1 px-6 lg:px-10 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground mb-1">Widget Documentation</h1>
        <p className="text-muted-foreground mb-10">Embed the ScaleFeedback widget on any site in under 2 minutes.</p>

        <div className="space-y-14">

          {/* ── Quick start ── */}
          <section id="quickstart">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px]">rocket_launch</span>
              Quick start
            </h2>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {[
                <>Go to <strong className="text-foreground">Projects</strong> → open your project → copy the <strong className="text-foreground">snippet</strong> from the Widget Settings tab.</>,
                <>Paste the snippet below before the closing <code className="bg-muted px-1 rounded text-xs">&lt;/body&gt;</code> tag of your site.</>,
                <>Reload your site — a <strong className="text-[#ff724f]">Feedback</strong> tab appears on the edge of the screen.</>,
                <>Submit a test report. It appears instantly in your ScaleFeedback dashboard.</>,
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
                Copy your Snippet code from <strong className="text-foreground">Projects → Settings → Widget Settings
                </strong>, then paste the snippet before the closing <code className="bg-muted px-1 rounded text-xs">&lt;/body&gt;</code> tag.
              </p>

              {/* Framework tabs */}
              <div className="flex gap-1 mb-3 bg-muted rounded-lg p-1 w-fit">
                {(['html', 'react', 'nextjs', 'vue'] as const).map((fw) => (
                  <button
                    key={fw}
                    onClick={() => setFramework(fw)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      framework === fw ? 'bg-white text-[#300a46] shadow-sm' : 'text-muted-foreground hover:text-foreground'
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

          {/* ── SDK & hooks ── */}
          <section id="sdk">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px]">code</span>
              SDK & Event hooks
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Trigger the widget programmatically, prefill user data, or react to events.
            </p>
            <CodeBlock lang="JavaScript" code={sdkSnippet} />

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { method: 'ScaleFeedback.open()', desc: 'Opens the widget panel' },
                { method: 'ScaleFeedback.close()', desc: 'Closes the widget panel' },
                { method: 'onSubmit(fb)', desc: 'Fires after a report is submitted' },
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
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-foreground text-xs">Option</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground text-xs">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground text-xs">Default</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground text-xs">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ['data-project *', 'HTML attribute', '—', 'Required. Your project API key set directly on the <script> tag.'],
                    ['color', 'string', '#ff724f', 'Accent color for the widget button and UI.'],
                    ['position', '"right" | "left"', '"right"', 'Side of screen the feedback tab appears on.'],
                    ['collectConsole', 'boolean', 'true', 'Capture browser console logs with each report.'],
                    ['collectNetwork', 'boolean', 'false', 'Capture failed XHR / fetch requests.'],
                    ['guestReporting', 'boolean', 'true', 'Show name & email fields for anonymous users.'],
                    ['reporterName', 'string', '—', 'Prefill the reporter name (e.g. from your auth).'],
                    ['reporterEmail', 'string', '—', 'Prefill the reporter email.'],
                    ['onOpen', '() => void', '—', 'Callback fired when the widget panel opens.'],
                    ['onClose', '() => void', '—', 'Callback fired when the widget panel closes.'],
                    ['onSubmit', '(fb: object) => void', '—', 'Callback fired after a successful submission.'],
                  ].map(([opt, type, def, desc]) => (
                    <tr key={opt} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs text-[#ff724f] whitespace-nowrap">{opt}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{def}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Troubleshooting ── */}
          <section id="troubleshooting">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px]">build</span>
              Troubleshooting
            </h2>
            <div className="space-y-3">
              {[
                {
                  q: 'The feedback tab is not showing',
                  a: 'Ensure the script tag is placed before the closing </body> tag and that projectApiKey is a valid key from your dashboard. Check the browser console for errors.',
                },
                {
                  q: 'Screenshots are blank or incomplete',
                  a: 'The widget uses html-to-image to capture screenshots. Cross-origin iframes and some CSS features (backdrop-filter) may not render. Ensure your site allows same-origin canvas access.',
                },
                {
                  q: 'Widget does not appear in production but works locally',
                  a: 'Check that your Content Security Policy (CSP) allows scripts from the ScaleFeedback domain. You may need to add it to script-src and connect-src.',
                },
                {
                  q: 'Console / network logs are empty',
                  a: 'Set collectConsole: true and collectNetwork: true in your config. Network capture only records failed requests (4xx / 5xx).',
                },
                {
                  q: 'Submissions are not appearing in the dashboard',
                  a: 'Verify the projectApiKey matches exactly. Check the Network tab for a POST to /api/feedback — any 4xx response means the key is wrong or the project is inactive.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="border border-border rounded-xl p-5">
                  <p className="font-semibold text-foreground text-sm mb-1.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ff724f] text-[16px]">help</span>
                    {q}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-6">{a}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-muted/50 border border-border rounded-xl p-5 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#ff724f] text-[20px] shrink-0">support_agent</span>
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">Still stuck?</p>
                <p className="text-sm text-muted-foreground">
                  Email us at{' '}
                  <a href="mailto:hello@scalefeedback.io" className="text-[#ff724f] hover:underline font-medium">
                    hello@scalefeedback.io
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
