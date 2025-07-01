import { useCallback, useEffect, useRef } from 'react';

import { useSWRConfig } from 'swr';

import type { TransactionRecord } from '~/types';

const CACHE_KEY = 'transactions';
const DEBOUNCE_DELAY = 1200;

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
  const lastSavedDataRef = useRef<string>('');
  // Mantén el último edit optimista hasta que el backend confirme
  const lastEditRef = useRef<TransactionRecord[] | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const debouncedSave = useCallback(
    (data: TransactionRecord[]) => {
      const dataString = JSON.stringify(
        data.map((r) => {
          const { id, ...rest } = r;
          return { id, ...rest };
        })
      );
      pendingDataRef.current = data;
      lastEditRef.current = data;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // OPTIMISTIC UPDATE: Mantén el edit en el cache hasta que el backend confirme
      Promise.resolve().then(() => {
        mutate(
          CACHE_KEY,
          (current: TransactionRecord[] | undefined) => {
            if (!current) return data;
            const map = new Map(current.map((r) => [r.id, r]));
            data.forEach((edit) =>
              map.set(edit.id, { ...map.get(edit.id), ...edit })
            );
            return Array.from(map.values());
          },
          false // no revalidar aún
        );
      });

      timeoutRef.current = setTimeout(async () => {
        if (lastSavedDataRef.current === dataString) return;
        try {
          const result = await saveFunction(pendingDataRef.current!);
          if (result.success) {
            lastSavedDataRef.current = dataString;
            // --- NO REVALIDES el cache inmediatamente, solo limpia los edits locales en el frontend cuando el backend confirma ---
            onSuccess();
            // Si quieres forzar una revalidación, hazlo después de limpiar los edits locales (en el efecto que limpia editValues)
          } else {
            // Si falla, revalida para restaurar el cache real
            mutate(CACHE_KEY, undefined, { revalidate: true });
          }
        } catch (error) {
          mutate(CACHE_KEY, undefined, { revalidate: true });
          console.error('Error saving data:', error);
        }
      }, delay);
    },
    [saveFunction, onSuccess, delay, mutate]
  );

  return debouncedSave;
}
