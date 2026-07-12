'use client';

import { useCallback, useEffect, useState } from 'react';

type UseApiResourceOptions = {
  enabled?: boolean;
};

export function useApiResource<T>(
  loader: () => Promise<T>,
  options: UseApiResourceOptions = {},
) {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError('');
      setIsLoading(true);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError('');
    loader()
      .then((result) => active && setData(result))
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Error');
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [loader, enabled]);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError('');
    try {
      setData(await loader());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [loader, enabled]);

  return { data, setData, error, setError, isLoading, reload };
}
