'use client';

import useSWR, { type SWRResponse } from 'swr';

import { getTransactions } from '~/server/actions/tableGeneral';

import type { TransactionRecord } from '~/types';

interface SWRResult<T> {
  data: T[] | undefined;
  error: Error | undefined;
  mutate: SWRResponse<T[], Error>['mutate'];
}

// SWR directo a la Server Action para máxima inmediatez (sin paginación, más egress)
const fetcher = async <T>(key: string): Promise<T[]> => {
  if (key === 'transactions') {
    return (await getTransactions()) as T[];
  }
  throw new Error('Invalid key');
};

export function useAppData(initialData?: TransactionRecord[]) {
  const { data, error, mutate }: SWRResult<TransactionRecord> = useSWR(
    'transactions',
    fetcher<TransactionRecord>,
    {
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      dedupingInterval: 1000,
      refreshInterval: 0, // Sin polling, solo mutate manual
      fallbackData: initialData,
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
