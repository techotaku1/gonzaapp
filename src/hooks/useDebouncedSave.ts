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
      // --- CORREGIDO: Permite guardar aunque esté guardando, pero solo toma el último cambio ---
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
                // --- CORREGIDO: NO limpies el cache ni revalides aquí, deja que el polling SWR lo haga ---
                return undefined;
              }
              throw new Error(result.error ?? 'Error al guardar');
            },
            {
              rollbackOnError: true,
              revalidate: false, // No refetch inmediato, solo polling
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
