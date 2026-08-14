'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DocsSidebar } from '../../docs-sidebar';
import { ArticleTOC } from '../../article-toc';

const TOC_ITEMS = [
  { id: 'why-webflow', label: 'Why choose Webflow integration?' },
  { id: 'how-to-add', label: 'How to add Pinmarks to Webflow' },
  { id: 'staging', label: 'Only include Pinmarks on your staging website' },
  { id: 'help', label: 'Need help?' },
];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.pinmarks.io';
const SNIPPET = `<script src="${APP_URL}/widget.js" data-project="YOUR_API_KEY"></script>`;
const STAGING_SNIPPET = `<script>
  // Only load Pinmarks if the URL includes webflow.io
  if (window.location.hostname.includes('webflow.io')) {
    var s = document.createElement('script');
    s.src = '${APP_URL}/widget.js';
    s.dataset.project = 'YOUR_API_KEY';
    s.async = true;
    document.body.appendChild(s);
  }
</script>`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs font-medium bg-[#ff724f] hover:bg-[#e8603a] text-white px-3 py-1.5 rounded-md transition-colors"
    >
      <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
      {copied ? 'Copied!' : 'Copy code'}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="border border-[#111111]/15 rounded-lg overflow-hidden">
      <div className="flex justify-end px-3 py-2 bg-[#111111]/5 border-b border-[#111111]/10">
        <CopyButton text={code} />
      </div>
      <pre className="px-4 py-4 text-sm font-mono text-gray-800 overflow-x-auto whitespace-pre bg-white leading-relaxed">{code}</pre>
    </div>
  );
}

export default function WebflowIntegrationDocs() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <DocsSidebar />

      <div className="flex-1 px-6 lg:px-10 py-8">
      <Link href="/docs" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-[#ff724f] transition-colors mb-6">
        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
        Back to documentation
      </Link>

      <ArticleTOC items={TOC_ITEMS} />

      <h1 className="text-2xl font-bold text-foreground mb-1">Webflow Integration</h1>
      <p className="text-muted-foreground mb-2">Get feedback directly from your Webflow website</p>
      <p className="text-xs text-muted-foreground mb-8">August 13, 2026</p>

      <div className="space-y-12">
        <section id="why-webflow">
          <h2 className="text-lg font-semibold text-foreground mb-3">Why choose Webflow integration?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Webflow is renowned for crafting responsive websites, landing pages, e-commerce platforms, blogs, and more. It
            boasts a robust content management system (CMS) and also functions as a hosting platform. By integrating
            Pinmarks with your Webflow site:
          </p>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>Streamline the feedback collection process on Webflow.</li>
            <li>Save significant developer time — no plugin or app install required.</li>
            <li>Capture visual bug reports with screenshots and console context directly in your Pinmarks dashboard.</li>
          </ul>
        </section>

        <hr className="border-border" />

        <section id="how-to-add">
          <h2 className="text-lg font-semibold text-foreground mb-3">How to add Pinmarks to Webflow</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            The Pinmarks widget loads from a single script tag, so it drops straight into Webflow&apos;s Custom Code panel —
            no separate hosted file needed.
          </p>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-muted-foreground mb-4">
            <li>
              Within <span className="text-foreground font-medium">{APP_URL.replace('https://', '')}</span>, navigate to
              your project&apos;s <strong className="text-foreground">Settings → Widget Installation → Code snippet</strong>{' '}
              tab and <strong className="text-foreground">copy the code</strong>.
            </li>
          </ul>
          <CodeBlock code={SNIPPET} />
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-muted-foreground mt-4">
            <li>Within your Webflow account, navigate to your <strong className="text-foreground">Project Settings</strong>.</li>
            <li>Select the <strong className="text-foreground">Custom Code</strong> tab.</li>
            <li>Paste the snippet into <strong className="text-foreground">Head Code</strong> (add it at the end of the <code className="bg-muted px-1 rounded text-xs">&lt;head&gt;</code> tag) and click <strong className="text-foreground">Save Changes</strong>.</li>
            <li>Click <strong className="text-foreground">Publish</strong> to take your changes live.</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">Visit your site — the widget will appear.</p>
        </section>

        <hr className="border-border" />

        <section id="staging">
          <h2 className="text-lg font-semibold text-foreground mb-3">Only include Pinmarks on your staging website</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            You might want your snippet visible only on your Webflow staging domain (the <code className="bg-muted px-1 rounded text-xs">*.webflow.io</code> subdomain)
            and not on your live custom domain. To do that, wrap the snippet in a check against <code className="bg-muted px-1 rounded text-xs">window.location.hostname</code>:
          </p>
          <CodeBlock code={STAGING_SNIPPET} />
        </section>

        <hr className="border-border" />

        <section id="help">
          <h2 className="text-lg font-semibold text-foreground mb-3">Need help?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Email us at{' '}
            <a href="mailto:hello@pinmarks.io" className="text-[#ff724f] hover:underline font-medium">hello@pinmarks.io</a>{' '}
            and we&apos;ll help you get set up.
          </p>
        </section>
      </div>
      </div>
    </div>
  );
}
