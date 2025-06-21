import { useCallback, useRef } from 'react';

import { useSWRConfig } from 'swr';
import { useDebouncedCallback } from 'use-debounce';
import type { TransactionRecord } from '~/types';

const CACHE_KEY = '/api/transactions';

export function useDebouncedSave(
  onSave: (
    records: TransactionRecord[]
  ) => Promise<{ success: boolean; error?: string }>,
  onSuccess: () => void,
  delay = 1000
) {
  const { mutate } = useSWRConfig();
  const recordsRef = useRef<TransactionRecord[]>([]);

  const debouncedSave = useDebouncedCallback(
    async (records: TransactionRecord[]) => {
      try {
        await mutate(
          CACHE_KEY,
          async () => {
            const result = await onSave(records);
            if (result.success) {
              onSuccess();
              return records;
            }
            throw new Error(result.error ?? 'Error saving');
          },
          {
            optimisticData: records,
            rollbackOnError: true,
            revalidate: false,
          }
        );
      } catch (error) {
        console.error('Error in debouncedSave:', error);
      }
    },
    delay,
    // Add options for better control
    {
      maxWait: 2000, // Maximum time to wait before forcing an update
      leading: false, // Don't execute on the leading edge
      trailing: true, // Execute on the trailing edge
    }
  );

  const save = useCallback(
    (records: TransactionRecord[]) => {
      recordsRef.current = records;
      return debouncedSave(records);
    },
    [debouncedSave]
  );

  return {
    save,
    isPending: debouncedSave.isPending,
    flush: debouncedSave.flush,
    cancel: debouncedSave.cancel,
  };
}
