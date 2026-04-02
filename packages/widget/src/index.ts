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

function init() {
  try {
    const config = parseConfig();
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
