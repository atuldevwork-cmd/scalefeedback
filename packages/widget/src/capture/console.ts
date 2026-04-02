import type { ConsoleLogEntry } from '../types';

const MAX_LOGS = 100;
const logs: ConsoleLogEntry[] = [];
let active = false;

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function intercept(level: ConsoleLogEntry['level'], original: (...args: unknown[]) => void) {
  return (...args: unknown[]) => {
    if (active && logs.length < MAX_LOGS) {
      logs.push({
        level,
        message: args.map((a) => {
          try {
            return typeof a === 'object' ? JSON.stringify(a) : String(a);
          } catch {
            return String(a);
          }
        }).join(' '),
        timestamp: Date.now(),
      });
    }
    original(...args);
  };
}

export const ConsoleCapture = {
  start() {
    if (active) return;
    active = true;
    console.log = intercept('log', originalConsole.log);
    console.info = intercept('info', originalConsole.info);
    console.warn = intercept('warn', originalConsole.warn);
    console.error = intercept('error', originalConsole.error);
  },

  stop() {
    active = false;
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  },

  getLogs(): ConsoleLogEntry[] {
    return [...logs];
  },

  clear() {
    logs.length = 0;
  },
};
