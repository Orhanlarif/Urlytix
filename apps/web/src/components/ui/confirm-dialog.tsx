'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
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

      <Modal
        open={Boolean(pending)}
        onClose={() => handleClose(false)}
        title={pending?.title ?? ''}
        description={pending?.description}
        closeLabel={t.common.close}
      >
        {pending && (
          <>
            {pending.variant === 'danger' && (
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--danger-border)] bg-[var(--danger-muted)]">
                <AlertTriangle className="h-5 w-5 text-[var(--danger)]" />
              </div>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                className="sm:min-w-28"
                onClick={() => handleClose(false)}
              >
                {pending.cancelLabel ?? t.common.cancel}
              </Button>

              <Button
                variant={pending.variant === 'danger' ? 'danger' : 'primary'}
                className="sm:min-w-28"
                onClick={() => handleClose(true)}
              >
                {pending.confirmLabel ?? t.common.confirm}
              </Button>
            </div>
          </>
        )}
      </Modal>
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
