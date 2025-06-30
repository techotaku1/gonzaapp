'use client';

import useSWR, { type SWRResponse } from 'swr';

import { getTransactions } from '~/server/actions/tableGeneral';

import type { TransactionRecord } from '~/types';

interface SWRResult<T> {
  data: T[] | undefined;
  error: Error | undefined;
  mutate: SWRResponse<T[], Error>['mutate'];
}

// SWR directo a la Server Action para totales (sin cache, máxima inmediatez)
const fetcher = async <T>(key: string): Promise<T[]> => {
  switch (key) {
    case 'transactions':
      return (await getTransactions()) as T[];
    default:
      throw new Error('Invalid key');
  }
};

const config = {
  revalidateOnFocus: true,
  shouldRetryOnError: true,
  dedupingInterval: 1000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  loadingTimeout: 30000,
  refreshInterval: 2000, // <-- Asegura polling aquí también
  refreshWhenHidden: true,
  refreshWhenOffline: true,
} as const;

export function useAppData(initialData?: TransactionRecord[]) {
  const { data, error, mutate }: SWRResult<TransactionRecord> = useSWR(
    'transactions',
    fetcher<TransactionRecord>,
    {
      ...config,
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
