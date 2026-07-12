'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '@/i18n/language-provider';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error';

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3500;

function ToastItem({
  toast,
  onDismiss,
  dismissLabel,
}: {
  toast: Toast;
  onDismiss: () => void;
  dismissLabel: string;
}) {
  const [depleted, setDepleted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setDepleted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'animate-toast-in pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-[var(--radius-lg)] border px-4 py-3 shadow-[var(--shadow-lg)] backdrop-blur',
        toast.type === 'success'
          ? 'border-[var(--success-border)] bg-[var(--success-muted)] text-[var(--success)]'
          : 'border-[var(--danger-border)] bg-[var(--danger-muted)] text-[var(--danger)]',
      )}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}

      <p className="flex-1 text-sm text-[var(--foreground)]">{toast.message}</p>

      <button
        type="button"
        aria-label={dismissLabel}
        onClick={onDismiss}
        className="rounded-lg p-1 text-current/70 transition hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>

      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 bg-current/40 transition-[width] ease-linear"
        style={{
          width: depleted ? '0%' : '100%',
          transitionDuration: `${TOAST_DURATION_MS}ms`,
        }}
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId.current;

    setToasts((current) => [...current, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  function dismiss(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        aria-label={t.common.notifications}
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
            dismissLabel={t.common.dismissNotification}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
