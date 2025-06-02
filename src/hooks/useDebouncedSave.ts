import { useCallback, useEffect, useRef } from 'react';

import type { TransactionRecord } from '~/types';

interface SaveResult {
  success: boolean;
  error?: string;
}

export function useDebouncedSave(
  onSave: (records: TransactionRecord[]) => Promise<SaveResult>,
  onSuccess: () => void,
  delay = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordsRef = useRef<TransactionRecord[]>([]);
  const pendingChangesRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const save = useCallback(
    (records: TransactionRecord[]) => {
      recordsRef.current = records;
      pendingChangesRef.current = true;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        if (pendingChangesRef.current) {
          try {
            const result = await onSave(recordsRef.current);
            if (result.success) {
              pendingChangesRef.current = false;
              onSuccess();
            }
          } catch (error) {
            console.error('Error saving:', error);
          } finally {
            timeoutRef.current = null;
          }
        }
      }, delay);
    },
    [delay, onSave, onSuccess]
  );

  return save;
}
