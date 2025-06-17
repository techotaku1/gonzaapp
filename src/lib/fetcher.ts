import type { TransactionRecord } from '~/types';

export const fetcher = async (url: string): Promise<TransactionRecord[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};
