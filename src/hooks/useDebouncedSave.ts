import { useState, useCallback, useEffect } from 'react';

import type { TransactionRecord } from '~/types';

export function useDebouncedSave(
  onSave: (records: TransactionRecord[]) => Promise<{ success: boolean; error?: string }>,
  onSuccess: () => void,
  delay = 3000
) {
  const [pendingSave, setPendingSave] = useState<{
    records: TransactionRecord[];
    timeoutId: NodeJS.Timeout;
  } | null>(null);

  const save = useCallback((records: TransactionRecord[]) => {
    const currentTimeoutId = pendingSave?.timeoutId;
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId);
    }

    const timeoutId = setTimeout(async () => {
      try {
        const result = await onSave(records);
        if (result.success) {
          onSuccess();
        }
      } catch (error) {
        console.error('Error al guardar:', error);
      } finally {
        setPendingSave(null);
      }
    }, delay);

    setPendingSave({ records, timeoutId });
  }, [delay, onSave, onSuccess, pendingSave?.timeoutId]);

  // Limpiar el timeout al desmontar
  useEffect(() => {
    return () => {
      if (pendingSave?.timeoutId) {
        clearTimeout(pendingSave.timeoutId);
      }
    };
  }, [pendingSave]);

  return save;
}
