import { useCallback, useEffect, useRef } from 'react';
import { mutate } from 'swr';

import type { TransactionRecord } from '~/types';

interface SaveResult {
  success: boolean;
  error?: string;
}

export function useDebouncedSave(
  onSave: (records: TransactionRecord[]) => Promise<SaveResult>,
  onSuccess: () => void,
  delay = 2000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef<TransactionRecord[]>([]);
  const batchSizeRef = useRef(0);
  const lastSaveRef = useRef(Date.now());

  const BATCH_SIZE_LIMIT = 5;
  const MIN_INTERVAL = 1000;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const save = useCallback(
    async (records: TransactionRecord[]) => {
      pendingRef.current = records;
      batchSizeRef.current++;

      const shouldSaveNow =
        batchSizeRef.current >= BATCH_SIZE_LIMIT ||
        Date.now() - lastSaveRef.current >= MIN_INTERVAL;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const processSave = async () => {
        if (pendingRef.current.length) {
          try {
            const result = await onSave(pendingRef.current);
            if (result.success) {
              // Update SWR cache
              await mutate('/api/transactions', pendingRef.current, false);
              lastSaveRef.current = Date.now();
              batchSizeRef.current = 0;
              onSuccess();
            }
          } catch (error) {
            console.error('Save error:', error);
          }
        }
      };

      if (shouldSaveNow) {
        await processSave();
      } else {
        timeoutRef.current = setTimeout(processSave, delay);
      }
    },
    [delay, onSave, onSuccess]
  );

  return save;
}
