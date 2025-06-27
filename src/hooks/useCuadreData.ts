'use client';

import useSWR, { type SWRResponse } from 'swr';

import { getCuadreRecords } from '~/server/actions/cuadreActions';

import type { ExtendedSummaryRecord } from '~/types';

interface SWRResult<T> {
  data: T[] | undefined;
  error: Error | undefined;
  mutate: SWRResponse<T[], Error>['mutate'];
}

const fetcher = async <T>(key: string): Promise<T[]> => {
  switch (key) {
    case 'cuadre':
      return (await getCuadreRecords()) as T[];
    default:
      throw new Error('Invalid key');
  }
};

const config = {
  revalidateOnFocus: true,
  shouldRetryOnError: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  loadingTimeout: 30000,
} as const;

export function useCuadreData(initialData?: ExtendedSummaryRecord[]) {
  const { data, error, mutate }: SWRResult<ExtendedSummaryRecord> = useSWR(
    'cuadre',
    fetcher<ExtendedSummaryRecord>,
    {
      ...config,
      refreshInterval: 2000,
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
