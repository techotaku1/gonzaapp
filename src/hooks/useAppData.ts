'use client';

import useSWR from 'swr';

import type { TransactionRecord } from '~/types';

export function useAppData(initialData?: TransactionRecord[]) {
  const { data, error, mutate } = useSWR(
    '/api/transactions',
    async (url) => {
      const res = await fetch(url);
      const json: unknown = await res.json();
      // Tipado seguro para evitar acceso inseguro a .data
      if (typeof json === 'object' && json !== null && 'data' in json) {
        return (json as { data: TransactionRecord[] }).data;
      }
      throw new Error('Respuesta inválida del backend');
    },
    {
      fallbackData: initialData,
      revalidateOnFocus: true,
      dedupingInterval: 10000,
      refreshInterval: 0, // o 10000 si quieres polling
    }
  );
  return {
    data: data ?? [],
    isLoading: !error && !data,
    isError: !!error,
    mutate,
  };
}
