import { useCallback, useRef } from 'react';

import { useSWRConfig } from 'swr';

import type { TransactionRecord } from '~/types';

const CACHE_KEY = '/api/transactions';
const DEBOUNCE_DELAY = 800; // ms

export function useDebouncedSave(
  onSave: (
    records: TransactionRecord[]
  ) => Promise<{ success: boolean; error?: string }>,
  onSuccess: () => void,
  delay = DEBOUNCE_DELAY
) {
  const { mutate } = useSWRConfig();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordsRef = useRef<TransactionRecord[]>([]);

  const save = useCallback(
    (records: TransactionRecord[]) => {
      recordsRef.current = records;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(async () => {
        // Optimistic update with SWR mutate
        await mutate(
          CACHE_KEY,
          async () => {
            const result = await onSave(recordsRef.current);
            if (result.success) {
              onSuccess();
              return recordsRef.current;
            }
            throw new Error(result.error ?? 'Error saving');
          },
          {
            optimisticData: recordsRef.current,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false,
          }
        );
      }, delay);
    },
    [mutate, onSave, onSuccess, delay]
  );

  return save;
}
