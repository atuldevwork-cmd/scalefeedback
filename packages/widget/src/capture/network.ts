import type { NetworkLogEntry } from '../types';

const MAX_LOGS = 50;
const logs: NetworkLogEntry[] = [];

const originalFetch = window.fetch.bind(window);
const OriginalXHR = window.XMLHttpRequest;

export const NetworkCapture = {
  start() {
    // Intercept fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? 'GET';
      const start = Date.now();

      try {
        const response = await originalFetch(input, init);
        if (!response.ok && logs.length < MAX_LOGS) {
          logs.push({
            url,
            method: method.toUpperCase(),
            status: response.status,
            duration: Date.now() - start,
            timestamp: start,
          });
        }
        return response;
      } catch (err) {
        if (logs.length < MAX_LOGS) {
          logs.push({
            url,
            method: method.toUpperCase(),
            error: err instanceof Error ? err.message : 'Network error',
            duration: Date.now() - start,
            timestamp: start,
          });
        }
        throw err;
      }
    };

    // Intercept XHR
    window.XMLHttpRequest = class extends OriginalXHR {
      private _url = '';
      private _method = '';
      private _start = 0;

      open(method: string, url: string | URL, ...args: [boolean?, string?, string?]) {
        this._url = url.toString();
        this._method = method;
        super.open(method, url, ...(args as [boolean, string?, string?]));
      }

      send(body?: Document | XMLHttpRequestBodyInit | null) {
        this._start = Date.now();
        this.addEventListener('load', () => {
          if (this.status >= 400 && logs.length < MAX_LOGS) {
            logs.push({
              url: this._url,
              method: this._method.toUpperCase(),
              status: this.status,
              duration: Date.now() - this._start,
              timestamp: this._start,
            });
          }
        });
        this.addEventListener('error', () => {
          if (logs.length < MAX_LOGS) {
            logs.push({
              url: this._url,
              method: this._method.toUpperCase(),
              error: 'Network error',
              duration: Date.now() - this._start,
              timestamp: this._start,
            });
          }
        });
        super.send(body);
      }
    };
  },

  stop() {
    window.fetch = originalFetch;
    window.XMLHttpRequest = OriginalXHR;
  },

  getLogs(): NetworkLogEntry[] {
    return [...logs];
  },

  clear() {
    logs.length = 0;
  },
};
