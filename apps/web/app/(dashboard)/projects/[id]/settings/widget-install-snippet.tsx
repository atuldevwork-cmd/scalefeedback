'use client';

import { useState } from 'react';
interface Props {
  apiKey: string;
}

export function WidgetInstallSnippet({ apiKey }: Props) {
  const [copied, setCopied] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://scalefeedback.app';

  const snippet = `<script src="${appUrl}/widget.js" data-project="${apiKey}"></script>`;

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <pre className="bg-gray-950 text-gray-100 rounded-lg px-4 py-4 text-xs font-mono overflow-x-auto whitespace-pre">
        {snippet}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
