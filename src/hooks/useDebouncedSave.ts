import { useCallback, useEffect, useRef } from 'react';

import type { TransactionRecord } from '~/types';

interface SaveResult {
  success: boolean;
  error?: string;
}

export function useDebouncedSave(
  onSave: (records: TransactionRecord[]) => Promise<SaveResult>,
  onSuccess: () => void,
  delay = 2000 // Increased default delay to 2 seconds
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordsRef = useRef<TransactionRecord[]>([]);
  const pendingChangesRef = useRef(false);
  const lastSaveRef = useRef<number>(Date.now());
  const changeBufferRef = useRef<Set<string>>(new Set());

  const minTimeBetweenSaves = 1000; // Minimum 1 second between saves
  const bufferSize = 3; // Minimum changes before triggering a save

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

      // Add change to buffer
      const changeId = Date.now().toString();
      changeBufferRef.current.add(changeId);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Only save if we have enough changes or enough time has passed
      const shouldSave =
        changeBufferRef.current.size >= bufferSize ||
        Date.now() - lastSaveRef.current >= minTimeBetweenSaves;

      timeoutRef.current = setTimeout(async () => {
        if (pendingChangesRef.current && shouldSave) {
          try {
            const result = await onSave(recordsRef.current);
            if (result.success) {
              pendingChangesRef.current = false;
              lastSaveRef.current = Date.now();
              changeBufferRef.current.clear();
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