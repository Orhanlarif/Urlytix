'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/language-provider';

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function handleClose(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {pending && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold">{pending.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {pending.description}
            </p>

            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleClose(false)}
              >
                {pending.cancelLabel ?? t.common.cancel}
              </Button>

              <Button
                variant={pending.variant === 'danger' ? 'danger' : 'primary'}
                fullWidth
                onClick={() => handleClose(true)}
              >
                {pending.confirmLabel ?? t.common.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }

  return context;
}
