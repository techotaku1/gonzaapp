import { useCallback, useEffect, useRef } from 'react';

import type { TransactionRecord } from '~/types';

interface SaveResult {
  success: boolean;
  error?: string;
}

export function useDebouncedSave(
  onSave: (records: TransactionRecord[]) => Promise<SaveResult>,
  onSuccess: () => void,
  delay = 3000
) {
  // Use refs to avoid dependency issues
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordsRef = useRef<TransactionRecord[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const save = useCallback(
    (records: TransactionRecord[]) => {
      // Cancel any pending save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Store latest records
      recordsRef.current = records;

      // Create new timeout
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await onSave(recordsRef.current);
          if (result.success) {
            onSuccess();
          }
        } catch (error) {
          console.error('Error al guardar:', error);
        } finally {
          timeoutRef.current = null;
        }
      }, delay);
    },
    [delay, onSave, onSuccess]
  );

  return save;
}
