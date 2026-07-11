'use client';

import { useCallback, useEffect, useState } from 'react';

export function useApiResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loader()
      .then((result) => active && setData(result))
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Error');
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [loader]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setData(await loader());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [loader]);

  return { data, setData, error, setError, isLoading, reload };
}
