import { useCallback, useEffect, useRef } from 'react';

import type { TransactionRecord } from '~/types';

interface SaveResult {
  success: boolean;
  error?: string;
}

export function useDebouncedSave(
  onSave: (records: TransactionRecord[]) => Promise<SaveResult>,
  onSuccess: () => void,
  delay = 1000 // Reducido a 1 segundo
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordsRef = useRef<TransactionRecord[]>([]);
  const pendingChangesRef = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // Guardar cambios pendientes al desmontar
        if (pendingChangesRef.current) {
          void onSave(recordsRef.current);
        }
      }
    };
  }, [onSave]);

  const save = useCallback(
    (records: TransactionRecord[]) => {
      recordsRef.current = records;
      pendingChangesRef.current = true;

      // Si ya hay un timeout pendiente, no crear uno nuevo
      if (timeoutRef.current) {
        return;
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
            console.error('Error al guardar:', error);
          } finally {
            timeoutRef.current = null;
            // Verificar si hay cambios nuevos después de guardar
            if (pendingChangesRef.current) {
              save(recordsRef.current);
            }
          }
        }
      }, delay);
    },
    [delay, onSave, onSuccess]
  );

  return save;
}
