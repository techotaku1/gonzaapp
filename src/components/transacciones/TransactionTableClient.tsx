'use client';

import { useState } from 'react';

import useSWR from 'swr';

import TransactionTable from '~/components/transacciones/TransactionTable';

import type { TransactionRecord } from '~/types';

const CACHE_KEY = '/api/transactions';

const fetcher = async (): Promise<TransactionRecord[]> => {
  const res = await fetch(CACHE_KEY);
  if (!res.ok) throw new Error('Error fetching transactions');
  // For type safety, ensure the result is TransactionRecord[]
  const data = await res.json();
  return data as TransactionRecord[];
};

export default function TransactionTableClient({
  initialData,
  onUpdateRecordAction,
}: {
  initialData: TransactionRecord[];
  onUpdateRecordAction: (
    records: TransactionRecord[]
  ) => Promise<{ success: boolean; error?: string }>;
}) {
  const [showTotals, setShowTotals] = useState(false);

  // SWR para datos en tiempo real
  const { data, mutate, isLoading } = useSWR<TransactionRecord[]>(
    CACHE_KEY,
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: 2000, // refresca cada 2 segundos
    }
  );

  // Cuando guardes, actualiza el caché SWR para todos los dispositivos
  const handleUpdateRecords = async (records: TransactionRecord[]) => {
    const result = await onUpdateRecordAction(records);
    if (result.success) {
      // Actualiza el caché local y de otros dispositivos
      await mutate();
    }
    return result;
  };

  return (
    <main className="container mx-auto min-h-screen px-4 pt-32">
      <TransactionTable
        initialData={data ?? []}
        onUpdateRecordAction={handleUpdateRecords}
        onToggleTotalsAction={() => setShowTotals((prev) => !prev)}
        showTotals={showTotals}
        isLoading={isLoading}
      />
    </main>
  );
}
