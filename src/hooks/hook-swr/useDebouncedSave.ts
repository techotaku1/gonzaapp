import { useCallback, useEffect, useRef } from 'react';

import { useSWRConfig } from 'swr';

import type { TransactionRecord } from '~/types';

const CACHE_KEY = '/api/transactions';
const DEBOUNCE_DELAY = 1000;

export function useDebouncedSave(
  saveFunction: (
    data: TransactionRecord[]
  ) => Promise<{ success: boolean; error?: string }>,
  onSuccess: () => void,
  delay = DEBOUNCE_DELAY
) {
  const { mutate } = useSWRConfig();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<TransactionRecord[] | null>(null);
  const isSavingRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedSave = useCallback(
    (data: TransactionRecord[]) => {
      pendingDataRef.current = data;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (isSavingRef.current) {
        return;
      }
      timeoutRef.current = setTimeout(async () => {
        if (!pendingDataRef.current) return;
        isSavingRef.current = true;
        try {
          await mutate(
            CACHE_KEY,
            async () => {
              const result = await saveFunction(pendingDataRef.current!);
              if (result.success) {
                onSuccess();
                // No retornes datos aquí, deja que SWR revalide desde el backend
                return undefined;
              }
              throw new Error(result.error ?? 'Error al guardar');
            },
            {
              // No uses optimisticData ni populateCache para evitar inconsistencias
              rollbackOnError: true,
              revalidate: true, // revalida para que otros clientes vean los cambios
              populateCache: false,
            }
          );
        } catch (error) {
          console.error('Error saving data:', error);
        } finally {
          isSavingRef.current = false;
          pendingDataRef.current = null;
        }
      }, delay);
    },
    [saveFunction, onSuccess, delay, mutate]
  );

  return debouncedSave;
}
