import { defineManifest } from '@crxjs/vite-plugin';

// Broad host permissions are required because capture is triggered by a click
// inside the PAGE (the Pinmarks widget's own launcher button), not a
// browser-toolbar action — `activeTab` alone cannot authorize
// chrome.tabs.captureVisibleTab() for that kind of trigger. Explicit
// http(s) patterns (rather than the literal "<all_urls>") intentionally
// exclude file:// / ftp:// — same capability the widget actually needs,
// narrower footprint at Chrome Web Store review time.
const HOST_PATTERNS = ['http://*/*', 'https://*/*'];

export default defineManifest({
  manifest_version: 3,
  name: 'Pinmarks for Chrome',
  version: '0.1.0',
  description: 'Enables frictionless and full-page screenshot capture for the Pinmarks feedback widget.',
  minimum_chrome_version: '116',
  permissions: ['activeTab', 'scripting', 'offscreen'],
  host_permissions: HOST_PATTERNS,
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: HOST_PATTERNS,
      js: ['src/content-script.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
});
