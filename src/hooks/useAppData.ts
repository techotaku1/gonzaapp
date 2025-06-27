'use client';

import useSWR, { type SWRResponse } from 'swr';

import { getTransactions } from '~/server/actions/tableGeneral';

import type { TransactionRecord } from '~/types';

interface SWRResult<T> {
  data: T[] | undefined;
  error: Error | undefined;
  mutate: SWRResponse<T[], Error>['mutate'];
}

const fetcher = async <T>(key: string): Promise<T[]> => {
  switch (key) {
    case 'transactions':
      return (await getTransactions()) as T[];
    default:
      throw new Error('Invalid key');
  }
};

export function useAppData() {
  const { data, error, mutate }: SWRResult<TransactionRecord> = useSWR(
    'transactions',
    fetcher<TransactionRecord>,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 2000, // actualiza cada 2 segundos
      dedupingInterval: 0, // desactiva deduplicación de cache
      fallbackData: undefined, // no usar fallbackData para forzar fetch real
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
