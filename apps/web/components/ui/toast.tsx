'use client';

import { createContext, useCallback, useContext, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal — fixed top-right */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none"
        style={{ minWidth: 300, maxWidth: 400 }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={[
              'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium border',
              'transition-all duration-300',
              t.exiting ? 'sf-toast-out' : 'sf-toast-in',
              t.type === 'success'
                ? 'bg-[#300a46] text-white border-[#300a46]'
                : t.type === 'error'
                ? 'bg-white text-[#300a46] border-red-200'
                : 'bg-gray-900 text-white border-gray-900',
            ].join(' ')}
          >
            {/* Icon */}
            <span
              className={[
                'material-symbols-outlined text-[20px] mt-0.5 shrink-0',
                t.type === 'success'
                  ? 'text-[#ff724f]'
                  : t.type === 'error'
                  ? 'text-red-500'
                  : 'text-blue-400',
              ].join(' ')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
            </span>

            {/* Message */}
            <span className="flex-1 leading-snug">{t.message}</span>

            {/* Close */}
            <button
              onClick={() => dismiss(t.id)}
              className={[
                'shrink-0 rounded-lg p-0.5 transition-colors',
                t.type === 'error'
                  ? 'text-gray-400 hover:text-gray-600'
                  : 'text-white/50 hover:text-white',
              ].join(' ')}
              aria-label="Dismiss"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
