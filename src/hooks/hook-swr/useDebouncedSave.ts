import { useCallback, useRef } from 'react';

import { useSWRConfig } from 'swr';
import { useDebouncedCallback } from 'use-debounce';

import type { TransactionRecord } from '~/types';

const CACHE_KEY = '/api/transactions';

export function useDebouncedSave(
  onSave: (
    records: Partial<TransactionRecord>[]
  ) => Promise<{ success: boolean; error?: string }>,
  onSuccess: () => void,
  delay = 1000
) {
  const { mutate } = useSWRConfig();
  const recordsRef = useRef<Partial<TransactionRecord>[]>([]);

  const debouncedSave = useDebouncedCallback(
    async (records: Partial<TransactionRecord>[]) => {
      try {
        await mutate(
          CACHE_KEY,
          async (currentData: TransactionRecord[] | undefined) => {
            const result = await onSave(records);
            if (result.success) {
              onSuccess();
              // Fusionar los cambios con los datos actuales
              if (currentData) {
                return currentData.map((record) => {
                  const updates = records.find((r) => r.id === record.id);
                  return updates ? { ...record, ...updates } : record;
                });
              }
              return currentData;
            }
            throw new Error(result.error ?? 'Error saving');
          },
          {
            revalidate: true,
            populateCache: true,
          }
        );
      } catch (error) {
        console.error('Error in debouncedSave:', error);
      }
    },
    delay,
    {
      maxWait: 2000,
      leading: false,
      trailing: true,
    }
  );

  const save = useCallback(
    (updates: Partial<TransactionRecord>[]) => {
      recordsRef.current = updates;
      return debouncedSave(updates);
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
