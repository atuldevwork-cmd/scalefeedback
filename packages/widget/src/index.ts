import { parseConfig } from './core/config';
import { ScaleFeedbackWidget } from './core/widget';

// Expose a global API for the host page
declare global {
  interface Window {
    ScaleFeedback: {
      open: () => void;
      version: string;
      /** Pre-identify the reporter. When set, the name/email fields are hidden in the form. */
      setUser: (user: { name: string; email: string } | null) => void;
      setMetadata: (meta: Record<string, unknown>) => void;
    };
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
    const widget = new ScaleFeedbackWidget(config);

    // Public SDK
    window.ScaleFeedback = {
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
    console.error('[ScaleFeedback]', err);
  }
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
