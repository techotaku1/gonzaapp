import useSWR, { type SWRConfiguration } from 'swr';
import type { TransactionRecord } from '~/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTransactions(config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<TransactionRecord[]>(
    '/api/transactions',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      ...config,
    }
  );

  return {
    transactions: data ?? [],
    isError: error,
    isLoading,
    mutate,
  };
}
