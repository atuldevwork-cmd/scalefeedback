import { record } from 'rrweb';
import type { WidgetConfig, FeedbackType, AnnotationTool } from '../types';
import { captureScreenshot } from '../capture/screenshot';
import { ConsoleCapture } from '../capture/console';
import { NetworkCapture } from '../capture/network';
import { collectMetadata } from '../capture/metadata';
import { AnnotationCanvas } from '../annotation/canvas';
import { submitFeedback } from './api';
import widgetStyles from '../ui/styles.css?inline';

const HOST_ID = 'scalefeedback-widget';
const SF_GUEST_KEY = 'sf_guest_identity';

type Step = 'annotate' | 'form' | 'submitting' | 'success';

export class ScaleFeedbackWidget {
  private config: WidgetConfig;
  private shadowRoot: ShadowRoot;
  private step: Step = 'annotate';
  private screenshotDataUrl = '';
  private annotationCanvas: AnnotationCanvas | null = null;
  private currentTool: AnnotationTool = 'arrow';
  private feedbackType: FeedbackType = 'bug';
  private isOpen = false;
  private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;
  private guestIdentityOverride = false; // true when user clicked "Change"
  private replayEvents: unknown[] = [];
  private stopRecording: (() => void) | null = null;

  constructor(config: WidgetConfig) {
    this.config = config;

    // Build shadow DOM host
    const host = document.createElement('div');
    host.id = HOST_ID;
    document.body.appendChild(host);
    this.shadowRoot = host.attachShadow({ mode: 'closed' });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = widgetStyles;
    this.shadowRoot.appendChild(style);

    // Start interceptors if configured
    if (config.collectConsole) ConsoleCapture.start();
    if (config.collectNetwork) NetworkCapture.start();
    if (config.sessionReplay) this.startReplayRecording();

    // Single persistent click handler — never removed, never { once: true }
    this.shadowRoot.addEventListener('click', (e) => this.handleClick(e));

    // Keyboard shortcut: Cmd+I (Mac) / Ctrl+I (Windows) → open widget
    document.addEventListener('keydown', (e) => {
      if (e.key === 'i' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (this.isOpen) this.closeWidget(); else void this.openWidget();
      }
    });

    // Render FAB
    this.renderFAB();
  }

  private startReplayRecording() {
    const BUFFER_MS = 30_000;
    this.stopRecording = record({
      emit: (event: unknown) => {
        this.replayEvents.push(event);
        // Rolling buffer: drop events older than 30 seconds.
        // checkoutEveryNms ensures a fresh FullSnapshot is emitted every 30s
        // so the buffer always contains one — without it the Replayer gets a
        // black screen because the initial snapshot was already dropped.
        const cutoff = Date.now() - BUFFER_MS;
        while (this.replayEvents.length > 0) {
          const first = this.replayEvents[0] as { timestamp: number };
          if (first.timestamp < cutoff) this.replayEvents.shift();
          else break;
        }
      },
      checkoutEveryNms: BUFFER_MS, // periodic FullSnapshot every 30s
      maskAllInputs: true,
      blockClass: 'sf-no-record',
    });
  }

  private renderFAB() {
    const pos = this.config.position ?? 'middle-right';
    // middle-right / middle-left → side tab; everything else → corner button
    const isSide = pos === 'middle-right' || pos === 'middle-left';
    const layoutClass = isSide ? 'sf-side' : 'sf-corner';
    const fab = document.createElement('button');
    fab.className = `sf-fab ${layoutClass} sf-pos-${pos}`;
    fab.setAttribute('aria-label', 'Send feedback');
    fab.style.backgroundColor = this.config.color;

    fab.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex-shrink:0">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      <span class="sf-fab-label">${this.config.buttonText ?? 'Report issue'}</span>
      <span class="sf-fab-dots">···</span>
    `;

    fab.addEventListener('click', () => this.openWidget());
    this.shadowRoot.appendChild(fab);
  }

  public open() {
    if (!this.isOpen) void this.openWidget();
  }

  /** Called by window.ScaleFeedback.setUser() — pre-identifies the reporter. */
  public setUser(user: { name: string; email: string } | null) {
    this.config.user = user ?? undefined;
  }

  private showLoadingOverlay() {
    // Append directly to document.body (NOT shadow DOM) so it stays visible
    // even when the widget host is hidden during screenshot capture
    const el = document.createElement('div');
    el.id = 'sf-body-loading-overlay';
    el.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:rgba(0,0,0,0.75)',
      'pointer-events:all',
    ].join(';');

    el.innerHTML = `
      <div style="
        display:flex;flex-direction:column;align-items:center;gap:14px;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      ">
        <div id="sf-body-spinner" style="
          width:40px;height:40px;
          border:3px solid rgba(255,255,255,0.2);border-top-color:#ffffff;
          border-radius:50%;
          animation:sf-body-spin 0.7s linear infinite;
        "></div>
        <span style="font-size:14px;font-weight:600;color:#ffffff;letter-spacing:0.01em;">Preparing…</span>
      </div>
      <style>
        @keyframes sf-body-spin { to { transform: rotate(360deg); } }
      </style>
    `;

    document.body.appendChild(el);

    // Put FAB in loading state
    const fab = this.shadowRoot.querySelector<HTMLButtonElement>('.sf-fab');
    if (fab) {
      fab.disabled = true;
      fab.style.opacity = '0.7';
    }
  }

  private hideLoadingOverlay() {
    document.getElementById('sf-body-loading-overlay')?.remove();
    const fab = this.shadowRoot.querySelector<HTMLButtonElement>('.sf-fab');
    if (fab) {
      fab.disabled = false;
      fab.style.opacity = '';
    }
  }

  private async openWidget() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.step = 'annotate';

    this.config.onOpen?.();

    // Show loading immediately so user knows something is happening
    this.showLoadingOverlay();

    try {
      this.screenshotDataUrl = await captureScreenshot(HOST_ID, this.config.apiBaseUrl);
      // Compression is deferred to just before upload so the annotation
      // canvas always displays the full-quality PNG.
    } catch (err) {
      console.warn('[ScaleFeedback] Screenshot capture failed, continuing without it.', err);
      this.screenshotDataUrl = '';
    }

    this.hideLoadingOverlay();
    this.attachBeforeUnload();
    this.renderModal();
  }

  private attachBeforeUnload() {
    this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  private detachBeforeUnload() {
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  }

  private renderModal() {
    // Remove existing overlay
    this.shadowRoot.querySelector('.sf-overlay')?.remove();
    this.shadowRoot.querySelector('.sf-overlay-annotate')?.remove();

    if (this.step === 'annotate') {
      // Full-screen annotate mode (no modal wrapper)
      const overlay = document.createElement('div');
      overlay.className = 'sf-overlay-annotate';
      overlay.innerHTML = this.renderAnnotateStep();
      this.shadowRoot.appendChild(overlay);
      this.initAnnotationCanvas();
      this.bindColorPicker();
      return;
    }

    // Centered modal for form / success
    const overlay = document.createElement('div');
    overlay.className = 'sf-overlay';
    const modal = document.createElement('div');
    modal.className = 'sf-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    if (this.step === 'success') {
      modal.innerHTML = this.renderSuccess();
    } else {
      modal.innerHTML = this.renderFormStep();
    }

    overlay.appendChild(modal);
    this.shadowRoot.appendChild(overlay);
  }

  private renderHeader(title: string): string {
    return `
      <div class="sf-modal-header">
        <span class="sf-modal-title">${title}</span>
        <button class="sf-close-btn" data-action="close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="sf-steps">
        <div class="sf-step ${this.step === 'annotate' ? 'active' : 'done'}"></div>
        <div class="sf-step ${this.step === 'form' ? 'active' : this.step === 'success' ? 'done' : ''}"></div>
      </div>
    `;
  }

  private toolBtn(tool: AnnotationTool, icon: string, label: string): string {
    return `<button class="sf-tool-btn ${this.currentTool === tool ? 'active' : ''}" data-tool="${tool}" title="${label}" aria-label="${label}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg>
      <span class="sf-tool-label">${label}</span>
    </button>`;
  }

  private renderAnnotateStep(): string {
    return `
      <div class="sf-annotate-panel">
      <div class="sf-annotate-topbar">
        <div class="sf-toolbar">
          ${this.toolBtn('arrow', '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', 'Arrow')}
          ${this.toolBtn('rectangle', '<rect x="3" y="3" width="18" height="18" rx="2"/>', 'Rect')}
          ${this.toolBtn('circle', '<circle cx="12" cy="12" r="9"/>', 'Circle')}
          ${this.toolBtn('freehand', '<path d="M3 17c3-3 5-6 8-6s5 4 8 4"/>', 'Draw')}
          ${this.toolBtn('text', '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>', 'Text')}
          ${this.toolBtn('blur', '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>', 'Blur')}
          ${this.toolBtn('select', '<path d="M5 3l14 9-7 1-3 7z"/>', 'Select')}
          <span class="sf-toolbar-sep"></span>
          <input type="color" class="sf-color-picker" value="#FF6B35" data-action="color" title="Color" />
          <button class="sf-tool-btn" data-action="undo" title="Undo" aria-label="Undo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
            </svg>
          </button>
        </div>
        <div class="sf-annotate-actions">
          <button class="sf-btn-secondary" data-action="close" style="padding:8px 14px;font-size:13px">Cancel</button>
          <button class="sf-btn-primary" data-action="next" style="padding:8px 18px;font-size:13px">
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="sf-annotate-canvas-area">
        <canvas id="sf-annotation-canvas"></canvas>
      </div>
      </div>
    `;
  }

  private getGuestIdentity(): { name: string; email: string } | null {
    try {
      const raw = localStorage.getItem(SF_GUEST_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.name && parsed?.email) return parsed;
    } catch { /* ignore */ }
    return null;
  }

  private saveGuestIdentity(name: string, email: string) {
    try { localStorage.setItem(SF_GUEST_KEY, JSON.stringify({ name, email })); } catch { /* ignore */ }
  }

  private renderFormStep(): string {
    return `
      ${this.renderHeader('Share Feedback')}
      <div class="sf-form">
        <div class="sf-field">
          <label class="sf-label">Type</label>
          <div class="sf-type-grid">
            <button class="sf-type-btn ${this.feedbackType === 'bug' ? 'active' : ''}" data-type="bug">
              <span class="sf-type-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C13.04 5.06 12.54 5 12 5c-.54 0-1.04.06-1.53.17L8.41 3 7 4.41l1.62 1.62C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"/></svg>
              </span>Bug
            </button>
            <button class="sf-type-btn ${this.feedbackType === 'suggestion' ? 'active' : ''}" data-type="suggestion">
              <span class="sf-type-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>
              </span>Idea
            </button>
            <button class="sf-type-btn ${this.feedbackType === 'question' ? 'active' : ''}" data-type="question">
              <span class="sf-type-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
              </span>Question
            </button>
            <button class="sf-type-btn ${this.feedbackType === 'other' ? 'active' : ''}" data-type="other">
              <span class="sf-type-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </span>Other
            </button>
          </div>
        </div>

        <div class="sf-field">
          <label class="sf-label" for="sf-title">Title <span style="color:#dc2626">*</span></label>
          <input id="sf-title" class="sf-input" type="text" placeholder="Brief summary…" />
        </div>

        <div class="sf-field">
          <label class="sf-label" for="sf-description">Description <span style="color:#6b5b8a;font-weight:400">(optional)</span></label>
          <textarea id="sf-description" class="sf-textarea" placeholder="What happened? What did you expect?"></textarea>
        </div>

        ${this.config.guestReporting ? (() => {
          // Host app has pre-identified the user — no fields needed
          if (this.config.user) return '';
          const saved = this.getGuestIdentity();
          // Saved identity exists and user hasn't requested to change it
          if (saved && !this.guestIdentityOverride) {
            return `
            <div style="display:flex;align-items:center;gap:6px;padding:10px 12px;background:#f5f3ff;border-radius:8px;font-size:13px;color:#4b5563">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.5" style="flex-shrink:0"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span style="flex:1">Submitting as <strong>${saved.name}</strong> &middot; <span style="color:#6b7280">${saved.email}</span></span>
              <button data-action="change-identity" style="background:none;border:none;cursor:pointer;color:#7c3aed;font-size:12px;font-weight:600;padding:0;text-decoration:underline">Change</button>
            </div>
            <input type="hidden" id="sf-name" value="${saved.name}" />
            <input type="hidden" id="sf-email" value="${saved.email}" />`;
          }
          // No saved identity (or user clicked Change) — show input fields
          return `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="sf-field">
              <label class="sf-label" for="sf-name">Your name <span style="color:#dc2626">*</span></label>
              <input id="sf-name" class="sf-input" type="text" placeholder="Jane Smith" value="${this.guestIdentityOverride && saved ? saved.name : ''}" required />
            </div>
            <div class="sf-field">
              <label class="sf-label" for="sf-email">Email <span style="color:#dc2626">*</span></label>
              <input id="sf-email" class="sf-input" type="email" placeholder="jane@company.com" value="${this.guestIdentityOverride && saved ? saved.email : ''}" required />
            </div>
          </div>`;
        })() : ''}

        <div id="sf-error" style="display:none;background:#fef2f2;color:#dc2626;border-radius:8px;padding:10px 14px;font-size:13px;"></div>
      </div>
      <div class="sf-footer">
        <button class="sf-btn-secondary" data-action="back">← Back</button>
        <button class="sf-btn-primary" data-action="submit">
          Send Feedback
        </button>
      </div>
    `;
  }

  private renderSuccess(): string {
    return `
      <div class="sf-success">
        <div class="sf-success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3>Feedback sent!</h3>
        <p>Thanks for helping us improve. Your feedback has been received.</p>
        <button class="sf-btn-primary" data-action="close" style="margin-top:8px">Done</button>
      </div>
    `;
  }

  private initAnnotationCanvas() {
    const canvasEl = this.shadowRoot.querySelector<HTMLCanvasElement>('#sf-annotation-canvas');
    if (!canvasEl) return;

    const area = canvasEl.parentElement as HTMLElement;

    // Wait one frame so the shadow DOM layout is computed and
    // area.clientWidth / clientHeight return the real rendered dimensions.
    // Fallback subtracts the overlay padding (60px each side) + toolbar (52px).
    requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      const areaW = area.clientWidth  || (window.innerWidth  - 56);
      const areaH = area.clientHeight || (window.innerHeight - 108);

      // Scale the buffer by DPR so it maps 1:1 to physical pixels on HiDPI
      // displays (Retina etc.). CSS width/height:100% from the stylesheet
      // controls the display size — no inline style override needed.
      canvasEl.width  = areaW * dpr;
      canvasEl.height = areaH * dpr;

      this.annotationCanvas = new AnnotationCanvas(canvasEl, this.screenshotDataUrl);
      this.annotationCanvas.setTool(this.currentTool);
    });
  }

  // Single persistent handler — handles all steps, never re-bound
  private handleClick(e: Event) {
    const target = e.target as HTMLElement;
    const action = target.closest('[data-action]')?.getAttribute('data-action');
    const tool = target.closest('[data-tool]')?.getAttribute('data-tool') as AnnotationTool | null;
    const typeBtn = target.closest('[data-type]')?.getAttribute('data-type') as FeedbackType | null;

    // Confirm-close dialog actions (always checked first)
    if (action === 'confirm-leave') { this.dismissConfirm(); this.closeWidget(); return; }
    if (action === 'keep-editing')  { this.dismissConfirm(); return; }

    // Universal close — show confirm if there's something to lose
    if (action === 'close') {
      if (this.step === 'success') {
        this.closeWidget();
      } else {
        this.showConfirmClose();
      }
      return;
    }

    // Annotate step
    if (this.step === 'annotate') {
      if (action === 'undo') { this.annotationCanvas?.undo(); return; }
      if (action === 'next') { this.goToForm(); return; }
      if (tool) {
        this.currentTool = tool;
        this.annotationCanvas?.setTool(tool);
        this.shadowRoot.querySelectorAll('[data-tool]').forEach((btn) => {
          btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
        });
      }
    }

    // Form step
    if (this.step === 'form') {
      if (action === 'back') { this.step = 'annotate'; this.renderModal(); return; }
      if (action === 'submit') { void this.handleSubmit(); return; }
      if (action === 'change-identity') { this.guestIdentityOverride = true; this.renderModal(); return; }
      if (typeBtn) {
        this.feedbackType = typeBtn;
        this.shadowRoot.querySelectorAll('[data-type]').forEach((btn) => {
          btn.classList.toggle('active', btn.getAttribute('data-type') === typeBtn);
        });
      }
    }

    // Success step
    if (this.step === 'success') {
      if (action === 'close') this.closeWidget();
    }
  }

  // Re-bind color picker after each annotate render (DOM is rebuilt)
  private bindColorPicker() {
    const colorPicker = this.shadowRoot.querySelector<HTMLInputElement>('[data-action="color"]');
    colorPicker?.addEventListener('input', (e) => {
      this.annotationCanvas?.setColor((e.target as HTMLInputElement).value);
    });
  }

  private goToForm() {
    if (this.annotationCanvas) {
      this.screenshotDataUrl = this.annotationCanvas.getAnnotatedDataUrl();
      this.annotationCanvas.destroy();
      this.annotationCanvas = null;
    }
    this.step = 'form';
    this.renderModal();
  }

  private async handleSubmit() {
    const title = this.shadowRoot.querySelector<HTMLInputElement>('#sf-title')?.value.trim();
    const description = this.shadowRoot.querySelector<HTMLTextAreaElement>('#sf-description')?.value.trim();
    const errorEl = this.shadowRoot.querySelector<HTMLElement>('#sf-error');
    const submitBtn = this.shadowRoot.querySelector<HTMLButtonElement>('[data-action="submit"]');

    // Use pre-identified user from config, or read from the form fields
    const name  = this.config.user?.name  ?? this.shadowRoot.querySelector<HTMLInputElement>('#sf-name')?.value.trim();
    const email = this.config.user?.email ?? this.shadowRoot.querySelector<HTMLInputElement>('#sf-email')?.value.trim();

    const showError = (msg: string) => {
      if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
    };

    if (!title) { showError('Please enter a title.'); return; }

    // Name and email are required when guestReporting is on and no user is pre-set
    if (this.config.guestReporting && !this.config.user) {
      if (!name)  { showError('Please enter your name.'); return; }
      if (!email) { showError('Please enter your email address.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Please enter a valid email address.');
        return;
      }
    }

    if (errorEl) errorEl.style.display = 'none';

    // Show loading
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="sf-spinner"></span> Sending…';
    }

    const metadata = collectMetadata();

    // Compress the annotated screenshot just before upload
    let screenshotToUpload = this.screenshotDataUrl;
    if (screenshotToUpload) {
      try {
        const { compressScreenshot } = await import('../capture/compress');
        screenshotToUpload = await compressScreenshot(screenshotToUpload);
      } catch { /* upload original PNG if compression fails */ }
    }

    try {
      await submitFeedback({
        apiBaseUrl: this.config.apiBaseUrl,
        projectApiKey: this.config.projectApiKey,
        screenshot: screenshotToUpload,
        reporterName: name,
        reporterEmail: email,
        title,
        description,
        type: this.feedbackType,
        consoleLogs: ConsoleCapture.getLogs(),
        networkLogs: NetworkCapture.getLogs(),
        sessionEvents: this.config.sessionReplay ? [...this.replayEvents] : undefined,
      });

      // Clear logs after successful submit
      ConsoleCapture.clear();
      NetworkCapture.clear();

      // Persist guest identity so they aren't asked again in this browser
      if (this.config.guestReporting && !this.config.user && name && email) {
        this.saveGuestIdentity(name, email);
        this.guestIdentityOverride = false;
      }

      this.config.onSubmit?.({ type: this.feedbackType, title, description });

      this.step = 'success';
      this.renderModal();
      setTimeout(() => { if (this.step === 'success') this.closeWidget(); }, 3000);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err instanceof Error ? err.message : 'Submission failed. Please try again.';
        errorEl.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Feedback';
      }
    }

    void metadata; // used inline in api.ts
  }

  private showConfirmClose() {
    this.shadowRoot.querySelector('.sf-confirm-overlay')?.remove();

    const subtitle = this.step === 'annotate'
      ? 'You will lose your annotations.'
      : 'You will lose your feedback.';

    const el = document.createElement('div');
    el.className = 'sf-confirm-overlay';
    el.innerHTML = `
      <div class="sf-confirm-modal">
        <button class="sf-confirm-x" data-action="keep-editing" aria-label="Dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <p class="sf-confirm-title">Are you sure you want to leave?</p>
        <p class="sf-confirm-subtitle">${subtitle}</p>
        <div class="sf-confirm-actions">
          <button class="sf-btn-secondary" data-action="keep-editing">Keep editing</button>
          <button class="sf-btn-danger" data-action="confirm-leave">Leave</button>
        </div>
      </div>
    `;
    this.shadowRoot.appendChild(el);
  }

  private dismissConfirm() {
    this.shadowRoot.querySelector('.sf-confirm-overlay')?.remove();
  }

  private closeWidget() {
    this.detachBeforeUnload();
    this.shadowRoot.querySelector('.sf-confirm-overlay')?.remove();
    document.getElementById('sf-body-loading-overlay')?.remove();
    this.shadowRoot.querySelector('.sf-overlay')?.remove();
    this.shadowRoot.querySelector('.sf-overlay-annotate')?.remove();
    this.annotationCanvas?.destroy();
    this.annotationCanvas = null;
    this.isOpen = false;
    this.screenshotDataUrl = '';
    this.guestIdentityOverride = false;
    this.replayEvents = [];
    if (this.stopRecording) { this.stopRecording(); this.stopRecording = null; }
    if (this.config.sessionReplay) this.startReplayRecording();
    // Reset FAB state
    const fab = this.shadowRoot.querySelector<HTMLButtonElement>('.sf-fab');
    if (fab) { fab.disabled = false; fab.style.opacity = ''; }
    this.config.onClose?.();
  }
}
