// Shared message shapes for the two boundaries this extension bridges:
//   page  <-postMessage->  content-script  <-chrome.runtime->  background
//   background            <-chrome.runtime->                   offscreen document

export const WIDGET_SOURCE = 'pinmarks-widget' as const;
export const EXTENSION_SOURCE = 'pinmarks-extension' as const;

export type PageRequestType = 'PING' | 'CAPTURE_VIEWPORT' | 'CAPTURE_FULL_PAGE';
export type ExtensionResponseType = 'PONG' | 'CAPTURE_VIEWPORT_RESULT' | 'CAPTURE_FULL_PAGE_RESULT';

export interface PageRequestMessage {
  source: typeof WIDGET_SOURCE;
  type: PageRequestType;
  requestId: string;
}

export interface ExtensionResponseMessage {
  source: typeof EXTENSION_SOURCE;
  type: ExtensionResponseType;
  requestId: string;
  version?: string;
  dataUrl?: string;
  error?: string;
}

// content-script -> background (chrome.runtime.sendMessage)
export type BackgroundRequest = { type: 'CAPTURE_VIEWPORT' } | { type: 'CAPTURE_FULL_PAGE' };
export type BackgroundResponse = { ok: true; dataUrl: string } | { ok: false; error: string };

// background -> offscreen document (chrome.runtime.sendMessage, target-routed)
export interface StitchResetMessage {
  target: 'offscreen';
  type: 'STITCH_RESET';
  totalWidthPx: number;
  totalHeightPx: number;
}
export interface StitchAddFrameMessage {
  target: 'offscreen';
  type: 'STITCH_ADD_FRAME';
  dataUrl: string;
  yPx: number;
}
export interface StitchFinalizeMessage {
  target: 'offscreen';
  type: 'STITCH_FINALIZE';
}
export type OffscreenMessage = StitchResetMessage | StitchAddFrameMessage | StitchFinalizeMessage;
export type OffscreenResponse = { ok: true; dataUrl?: string } | { ok: false; error: string };
