'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DocsSidebar } from '../../docs-sidebar';
import { ArticleTOC } from '../../article-toc';

const TOC_ITEMS = [
  { id: 'why-hubspot', label: 'Why HubSpot' },
  { id: 'why-pinmarks', label: 'Why Pinmarks?' },
  { id: 'how-to-add', label: 'How to add Pinmarks to HubSpot' },
  { id: 'individual-page', label: 'Add the widget to an individual page' },
  { id: 'all-pages', label: 'Add the widget to all pages' },
  { id: 'issues', label: 'Still having issues?' },
];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.pinmarks.io';
const SNIPPET = `<script src="${APP_URL}/widget.js" data-project="YOUR_API_KEY"></script>`;

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

export default function HubSpotIntegrationDocs() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <DocsSidebar />

      <div className="flex-1 px-6 lg:px-10 py-8">
      <Link href="/docs" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-[#ff724f] transition-colors mb-6">
        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
        Back to documentation
      </Link>

      <ArticleTOC items={TOC_ITEMS} />

      <h1 className="text-2xl font-bold text-foreground mb-1">HubSpot CMS Integration</h1>
      <p className="text-muted-foreground mb-2">Website feedback on HubSpot has never been as easy</p>
      <p className="text-xs text-muted-foreground mb-8">August 13, 2026</p>

      <div className="space-y-12">
        <section id="why-hubspot">
          <h2 className="text-lg font-semibold text-foreground mb-3">Why HubSpot</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            HubSpot CMS combines website creation with the power of a CRM platform to customize the buying journey for every visitor.
          </p>
        </section>

        <hr className="border-border" />

        <section id="why-pinmarks">
          <h2 className="text-lg font-semibold text-foreground mb-3">Why Pinmarks?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            With Pinmarks, collecting visual feedback and bug reports on your HubSpot site takes minutes, not hours of
            developer time. Every report — screenshot, console logs, and page context included — lands directly in your
            Pinmarks dashboard.
          </p>
        </section>

        <hr className="border-border" />

        <section id="how-to-add">
          <h2 className="text-lg font-semibold text-foreground mb-3">How to add Pinmarks to HubSpot</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Unlike some tools, Pinmarks doesn&apos;t require hosting a custom JavaScript file in HubSpot&apos;s Design Manager —
            the widget loads from a single script tag, so you can paste it directly into a Footer HTML field.
          </p>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-muted-foreground mb-4">
            <li>
              Within <span className="text-foreground font-medium">{APP_URL.replace('https://', '')}</span>, open your
              project&apos;s <strong className="text-foreground">Settings → Widget Installation → Code snippet</strong> tab
              and click <strong className="text-foreground">Copy code</strong>.
            </li>
          </ul>
          <CodeBlock code={SNIPPET} />
        </section>

        <hr className="border-border" />

        <section id="individual-page">
          <h2 className="text-lg font-semibold text-foreground mb-3">Add the Pinmarks widget to an individual page</h2>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>In your HubSpot account, navigate to <strong className="text-foreground">Marketing → Website → Website Pages</strong> (or <strong className="text-foreground">Landing Pages</strong>).</li>
            <li>Hover over the page you want to edit, then click <strong className="text-foreground">Edit</strong>.</li>
            <li>In the page editor, click the <strong className="text-foreground">Settings</strong> tab.</li>
            <li>Click <strong className="text-foreground">Advanced options</strong>.</li>
            <li>In the <strong className="text-foreground">Footer HTML</strong> section, paste the snippet from the previous step.</li>
            <li>In the upper right, click <strong className="text-foreground">Update</strong> to publish the change.</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">You should now see the feedback button on that page.</p>
        </section>

        <hr className="border-border" />

        <section id="all-pages">
          <h2 className="text-lg font-semibold text-foreground mb-3">Add the Pinmarks widget to all pages</h2>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>In your HubSpot account, click the <strong className="text-foreground">settings icon</strong> in the main navigation bar.</li>
            <li>In the left sidebar menu, navigate to <strong className="text-foreground">Website → Pages</strong>.</li>
            <li>Choose the domain you want to edit, then scroll to <strong className="text-foreground">Site footer HTML</strong> and paste the snippet.</li>
            <li>Click <strong className="text-foreground">Save</strong>.</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">You should now see the widget on every page of that domain.</p>
        </section>

        <hr className="border-border" />

        <section id="issues">
          <h2 className="text-lg font-semibold text-foreground mb-3">Still having issues?</h2>
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
