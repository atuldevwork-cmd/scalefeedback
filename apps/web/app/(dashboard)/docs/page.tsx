'use client';

import { useState } from 'react';

const SNIPPET = (apiKey: string, color: string, position: string) => `<script>
  window.ScaleFeedbackConfig = {
    projectApiKey: "${apiKey}",
    color: "${color}",
    position: "${position}",
    collectConsole: true,
    collectNetwork: true,
    guestReporting: true,
  };
</script>
<script src="https://your-domain.com/widget.js" async></script>`;

const SDK_SNIPPET = `// Programmatic trigger (open widget from your own button)
ScaleFeedback.open();

// Event hooks (in widget config)
window.ScaleFeedbackConfig = {
  projectApiKey: "proj_...",
  onOpen: () => console.log('Widget opened'),
  onClose: () => console.log('Widget closed'),
  onSubmit: (fb) => console.log('Submitted:', fb),
};`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs font-medium text-gray-400 hover:text-white transition-colors"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function DocsPage() {
  const [apiKey, setApiKey] = useState('proj_your_api_key_here');
  const [color, setColor] = useState('#ff724f');
  const [position, setPosition] = useState('right');

  const snippet = SNIPPET(apiKey, color, position);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">Widget Documentation</h1>
      <p className="text-muted-foreground mb-10">Embed the ScaleFeedback widget on any website in under 2 minutes.</p>

      <div className="space-y-10">
        {/* Step 1 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-full bg-[#ff724f] text-white text-sm font-bold flex items-center justify-center shrink-0">1</div>
            <h2 className="text-lg font-semibold text-foreground">Configure your widget</h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">API Key</label>
                <input value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] bg-background" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Accent Color</label>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent" />
                  <input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 text-sm font-mono focus:outline-none bg-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Position</label>
                <select value={position} onChange={(e) => setPosition(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] bg-background">
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-full bg-[#ff724f] text-white text-sm font-bold flex items-center justify-center shrink-0">2</div>
            <h2 className="text-lg font-semibold text-foreground">Add to your website</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Paste this snippet before the closing <code className="bg-muted px-1 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag.</p>
          <div className="bg-gray-950 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <span className="text-xs text-gray-400 font-mono">HTML</span>
              <CopyButton text={snippet} />
            </div>
            <pre className="p-4 text-sm text-gray-200 overflow-x-auto font-mono leading-relaxed">{snippet}</pre>
          </div>
        </section>

        {/* Step 3 - SDK */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-full bg-[#ff724f] text-white text-sm font-bold flex items-center justify-center shrink-0">3</div>
            <h2 className="text-lg font-semibold text-foreground">SDK & Event hooks (optional)</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Trigger the widget programmatically or hook into events.</p>
          <div className="bg-gray-950 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <span className="text-xs text-gray-400 font-mono">JavaScript</span>
              <CopyButton text={SDK_SNIPPET} />
            </div>
            <pre className="p-4 text-sm text-gray-200 overflow-x-auto font-mono leading-relaxed">{SDK_SNIPPET}</pre>
          </div>
        </section>

        {/* Config reference */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Configuration reference</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-foreground">Option</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Default</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['projectApiKey', 'string', '—', 'Required. Your project API key.'],
                  ['color', 'string', '#ff724f', 'Accent color for the widget button.'],
                  ['position', '"right" | "left"', '"right"', 'Side of screen the tab appears on.'],
                  ['collectConsole', 'boolean', 'true', 'Capture browser console logs.'],
                  ['collectNetwork', 'boolean', 'false', 'Capture failed network requests.'],
                  ['guestReporting', 'boolean', 'true', 'Show name/email fields in form.'],
                  ['onOpen', '() => void', '—', 'Called when widget is opened.'],
                  ['onClose', '() => void', '—', 'Called when widget is closed.'],
                  ['onSubmit', '(fb) => void', '—', 'Called after successful submission.'],
                ].map(([opt, type, def, desc]) => (
                  <tr key={opt} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-[#ff724f]">{opt}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{def}</td>
                    <td className="px-4 py-3 text-muted-foreground">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
