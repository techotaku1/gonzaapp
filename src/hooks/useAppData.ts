'use client';

import useSWR, { type SWRResponse } from 'swr';

import type { TransactionRecord } from '~/types';

interface SWRResult<T> {
  data: T[] | undefined;
  error: Error | undefined;
  mutate: SWRResponse<T[], Error>['mutate'];
}

const fetcher = async <T>(key: string): Promise<T[]> => {
  if (key === '/api/transactions') {
    const res = await fetch('/api/transactions', { cache: 'no-store' });
    if (!res.ok) throw new Error('Error fetching transactions');
    const json: unknown = await res.json();
    // Tipado seguro para evitar acceso inseguro a .data
    if (typeof json === 'object' && json !== null && 'data' in json) {
      return (json as { data: T[] }).data;
    }
    throw new Error('Respuesta inválida del backend');
  }
  throw new Error('Invalid key');
};

export function useAppData() {
  const { data, error, mutate }: SWRResult<TransactionRecord> = useSWR(
    '/api/transactions',
    fetcher<TransactionRecord>,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 2000,
      dedupingInterval: 0,
      fallbackData: undefined,
    }
  );

  return {
    data: data ?? [],
    isLoading: !error && !data,
    isError: error !== undefined,
    mutate: async () => {
      const result = await mutate();
      return result ?? [];
    },
  };
}
