'use client';

import { useState } from 'react';

interface Props {
  apiKey: string;
  projectName?: string;
}

type Tab = 'snippet' | 'npm' | 'cms';

const CMS_PLATFORMS = [
  { name: 'WordPress',          abbr: 'WP'  },
  { name: 'Drupal',             abbr: 'DR'  },
  { name: 'Google Tag Manager', abbr: 'GTM' },
  { name: 'Webflow',            abbr: 'WF'  },
  { name: 'Squarespace',        abbr: 'SS'  },
  { name: 'Ghost',              abbr: 'GH'  },
  { name: 'Prestashop',         abbr: 'PS'  },
  { name: 'Craft CMS',          abbr: 'CR'  },
  { name: 'Shopify',            abbr: 'SH'  },
  { name: 'Sylius',             abbr: 'SY'  },
  { name: 'HubSpot',            abbr: 'HS'  },
  { name: 'Bubble.io',          abbr: 'BB'  },
  { name: 'Wix',                abbr: 'WX'  },
  { name: 'MkDocs',             abbr: 'MK'  },
];

function StepNumber({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 rounded-full bg-[#ff724f] text-white text-xs font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
  );
}

function SnippetCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border border-[#111111]/15 rounded-lg overflow-hidden">
      <div className="flex justify-end px-3 py-2 bg-[#111111]/5 border-b border-[#111111]/10">
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1.5 text-xs font-medium bg-[#ff724f] hover:bg-[#e8603a] text-white px-3 py-1.5 rounded-md transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
      <pre className="px-4 py-4 text-sm font-mono text-gray-800 overflow-x-auto whitespace-pre bg-white leading-relaxed">{code}</pre>
    </div>
  );
}

function LightCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border border-[#111111]/15 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#111111]/5 border-b border-[#111111]/10">
        <span className="text-xs text-[#111111]/40 font-mono">code</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1 text-xs font-medium text-[#ff724f] hover:text-[#ff724f] transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
      <pre className="px-4 py-3 text-sm font-mono text-gray-800 overflow-x-auto whitespace-pre bg-white leading-relaxed">{code}</pre>
    </div>
  );
}

export function WidgetInstallSnippet({ apiKey, projectName }: Props) {
  const [tab, setTab] = useState<Tab>('snippet');
  const [showModal, setShowModal] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://scalefeedback.app';
  const snippet = `<script src="${appUrl}/widget.js" data-project="${apiKey}"></script>`;

  const npmInstall = `npm install -s @scalefeedback/widget`;
  const npmUsage = `import scaleFeedback from '@scalefeedback/widget';\n\nconst widget = await scaleFeedback.init({\n  projectKey: '${apiKey}',\n});`;

  const defaultSubject = 'Can you install this widget on our website?';
  const defaultMessage = `Hi,

Can you please help me install the Pinmarks widget on our website${projectName ? ` for the "${projectName}" project` : ''}?

This will help us collect visual bug reports and feedback from users.

Simply add the following snippet before the closing </body> tag on each page:

${snippet}

Full docs: ${appUrl}/docs

Thanks!`;

  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);

  function openModal() {
    setSubject(defaultSubject);
    setMessage(defaultMessage);
    setDevEmail('');
    setSent(false);
    setShowModal(true);
  }

  function handleSend() {
    if (!devEmail.trim()) return;
    const mailto = `mailto:${encodeURIComponent(devEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(mailto, '_blank');
    setSent(true);
    setTimeout(() => { setShowModal(false); setSent(false); }, 1500);
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'snippet', label: 'Code snippet', icon: 'code'      },
    { id: 'npm',     label: 'NPM package',  icon: 'package_2' },
    { id: 'cms',     label: 'CMS plugins',  icon: 'extension' },
  ];

  return (
    <>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[#ff724f] text-[#ff724f]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-muted-foreground hover:text-[#ff724f] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
          Send to developer
        </button>
      </div>

      {/* ── Code snippet ── */}
      {tab === 'snippet' && (
        <div className="divide-y divide-[#111111]/10 border border-[#111111]/15 rounded-xl overflow-hidden">
          {/* Step 1 */}
          <div className="flex flex-col sm:flex-row items-start gap-6 p-6">
            <div className="shrink-0 sm:w-52">
              <div className="flex items-center gap-2 mb-2">
                <StepNumber n={1} />
                <p className="font-semibold text-sm text-[#111111]">Install snippet</p>
              </div>
              <p className="text-xs text-muted-foreground pl-8 leading-relaxed">
                Insert this code in the <code className="bg-[#ff724f]/10 text-[#ff724f] px-1 rounded text-[11px]">&lt;head&gt;</code> tag of each page where you want the widget to appear.
              </p>
            </div>
            <div className="flex-1 w-full">
              <SnippetCodeBlock code={snippet} />
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col sm:flex-row items-start gap-6 p-6">
            <div className="shrink-0 sm:w-52">
              <div className="flex items-center gap-2 mb-2">
                <StepNumber n={2} />
                <p className="font-semibold text-sm text-[#111111]">Verify installation</p>
              </div>
            </div>
            <div className="flex-1 w-full space-y-3">
              {verified === true && (
                <div className="flex items-center gap-2 px-4 py-3 border border-green-300 bg-green-50 rounded-lg text-sm text-green-700">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Widget script detected on your website.
                </div>
              )}
              {verified === false && (
                <div className="flex items-center gap-2 px-4 py-3 border border-red-200 bg-red-50 rounded-lg text-sm text-red-600">
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  Widget script not detected. Make sure the snippet is added correctly.
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Website URL</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={verifyUrl}
                    onChange={(e) => { setVerifyUrl(e.target.value); setVerified(null); }}
                    placeholder="e.g. www.website.com"
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff724f]/20 focus:border-[#ff724f]/50"
                  />
                  <button
                    onClick={async () => {
                      if (!verifyUrl.trim()) return;
                      setVerifying(true); setVerified(null);
                      try {
                        const url = verifyUrl.startsWith('http') ? verifyUrl : `https://${verifyUrl}`;
                        const res = await fetch(`/api/verify-widget?url=${encodeURIComponent(url)}&key=${apiKey}`);
                        const { found } = await res.json() as { found: boolean };
                        setVerified(found);
                      } catch { setVerified(false); }
                      finally { setVerifying(false); }
                    }}
                    disabled={!verifyUrl.trim() || verifying}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#111111] text-white rounded-lg hover:bg-[#333333] transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    {verifying ? 'Checking…' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NPM package ── */}
      {tab === 'npm' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">construction</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">NPM package — coming soon</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                The <code className="bg-amber-100 px-1 rounded">@scalefeedback/widget</code> npm package is under development. Use the <button onClick={() => setTab('snippet')} className="underline font-medium hover:text-amber-900">Code snippet</button> tab in the meantime.
              </p>
            </div>
          </div>
        <div className="divide-y divide-[#111111]/10 border border-[#111111]/15 rounded-xl overflow-hidden pointer-events-none select-none">
          {/* Step 1 */}
          <div className="flex flex-col sm:flex-row items-start gap-6 p-6">
            <div className="shrink-0 sm:w-48">
              <div className="flex items-center gap-2 mb-2">
                <StepNumber n={1} />
                <p className="font-semibold text-sm text-[#111111]">Install the package</p>
              </div>
            </div>
            <div className="flex-1 w-full">
              <LightCodeBlock code={npmInstall} />
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col sm:flex-row items-start gap-6 p-6">
            <div className="shrink-0 sm:w-48">
              <div className="flex items-center gap-2 mb-2">
                <StepNumber n={2} />
                <p className="font-semibold text-sm text-[#111111]">Setup the SDK in your code</p>
              </div>
            </div>
            <div className="flex-1 w-full">
              <LightCodeBlock code={npmUsage} />
            </div>
          </div>

          {/* Resource links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#111111]/10 bg-[#111111]/3">
            {[
              { icon: 'package_2', label: 'npm Package',      sub: 'View in npm',        href: 'https://www.npmjs.com/package/@scalefeedback/widget' },
              { icon: 'code',      label: 'GitHub repository', sub: 'View in GitHub',     href: 'https://github.com/atuldevwork-cmd/scalefeedback'    },
              { icon: 'menu_book', label: 'Documentation',     sub: 'View documentation', href: `${appUrl}/docs`                                       },
            ].map(({ icon, label, sub, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-5 hover:bg-[#ff724f]/5 transition-colors group">
                <span className="material-symbols-outlined text-[22px] text-[#111111]/40 group-hover:text-[#ff724f] transition-colors">{icon}</span>
                <div>
                  <p className="text-sm font-medium text-[#111111]">{label}</p>
                  <p className="text-xs text-muted-foreground group-hover:text-[#ff724f] transition-colors">{sub}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
        </div>
      )}

      {/* ── CMS plugins ── */}
      {tab === 'cms' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">construction</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">CMS plugins — coming soon</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Native CMS integrations are under development. Use the <button onClick={() => setTab('snippet')} className="underline font-medium hover:text-amber-900">Code snippet</button> tab in the meantime.
              </p>
            </div>
          </div>
          <div className="pointer-events-none select-none">
          <p className="text-sm text-muted-foreground mb-5">
            Native plugins for your favourite CMS — no code required.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CMS_PLATFORMS.map(({ name, abbr }) => (
              <div key={name} className="border border-[#111111]/10 rounded-xl p-4 flex items-center gap-3 cursor-not-allowed">
                <div className="w-9 h-9 rounded-lg bg-[#111111]/8 flex items-center justify-center text-[10px] font-bold text-[#111111]/50 shrink-0">
                  {abbr}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#111111] leading-tight">{name}</p>
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#ff724f]/10 text-[#ff724f] font-medium">
                    Coming soon
                  </span>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* ── Send to developer modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header with brand gradient */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#111111]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff724f] text-[22px]">forward_to_inbox</span>
                <h3 className="text-base font-semibold text-white">Email your developer</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">Email</label>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                  placeholder="Enter your developer's email address"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/20 focus:border-[#ff724f]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/20 focus:border-[#ff724f]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full border border-border rounded-lg px-3 py-2 text-xs resize-none font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#ff724f]/20 focus:border-[#ff724f]/50"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex justify-end">
              <button
                onClick={handleSend}
                disabled={!devEmail.trim() || sent}
                className="px-5 py-2 bg-[#ff724f] hover:bg-[#e8603a] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sent
                  ? <><span className="material-symbols-outlined text-[16px]">check_circle</span> Opening…</>
                  : <><span className="material-symbols-outlined text-[16px]">send</span> Send</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
