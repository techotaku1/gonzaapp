import useSWR from 'swr';
import { getCuadreRecords } from '~/server/actions/cuadreActions';
import type { ExtendedSummaryRecord } from '~/types';

export function useCuadreData(initialData?: ExtendedSummaryRecord[]) {
  const { data, error, mutate } = useSWR(
    '/api/cuadre',
    getCuadreRecords,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );
  return {
    data: data ?? [],
    isLoading: !error && !data,
    isError: !!error,
    mutate,
  };
}
