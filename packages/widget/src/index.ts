import { parseConfig } from './core/config';
import { PinmarksWidget } from './core/widget';

// Expose a global API for the host page
declare global {
  interface Window {
    Pinmarks: {
      open: () => void;
      version: string;
      /** Pre-identify the reporter. When set, the name/email fields are hidden in the form. */
      setUser: (user: { name: string; email: string } | null) => void;
      setMetadata: (meta: Record<string, unknown>) => void;
    };
    __PINMARKS_LOADED__?: boolean;
  }
}

async function init() {
  try {
    const config = await parseConfig();

    // pages: 'hidden' — do not render the widget at all
    if (config.pages === 'hidden') return;

    // pages: 'secret_param' — only show when the secret URL parameter is present
    if (config.pages === 'secret_param') {
      const params = new URLSearchParams(window.location.search);
      if (config.secretParamType === 'custom' && config.secretParam) {
        if (!params.has(config.secretParam)) return;
      } else {
        // Default: ?bug or ?feedback
        if (!params.has('bug') && !params.has('feedback')) return;
      }
    }

    // audience: 'members_only' — only show if user is pre-identified via setUser
    // Widget will render but FAB is deferred until setUser is called
    const widget = new PinmarksWidget(config);

    // Public SDK
    window.Pinmarks = {
      open() {
        widget.open();
      },
      version: '1.0.0',
      setUser(user) {
        widget.setUser(user);
      },
      setMetadata(meta) {
        (widget as unknown as Record<string, unknown>)['_meta'] = meta;
      },
    };
  } catch (err) {
    console.error('[Pinmarks]', err);
  }
}

// Guard against double-initialization — if the script tag is present more than
// once on the page, or re-executes (host-page re-render/HMR), a second run would
// mount a second `#pinmarks-widget` host with its own full UI stacked on the first.
// This flag is set synchronously so a same-tick second execution can't race past it.
if (!window.__PINMARKS_LOADED__) {
  window.__PINMARKS_LOADED__ = true;

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
