'use client';

import { useState } from 'react';
import useSWR from 'swr';

import TransactionTable from '~/components/transacciones/TransactionTable';

import type { TransactionRecord } from '~/types';

export default function TransactionTableClient({
  initialData,
  onUpdateRecordAction,
}: {
  initialData: TransactionRecord[];
  onUpdateRecordAction: (
    records: TransactionRecord[]
  ) => Promise<{ success: boolean; error?: string }>;
}) {
  // Usar SWR para obtener datos en tiempo real
  const { data: transactions = initialData, mutate } = useSWR(
    '/api/transactions',
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al obtener transacciones');
      return res.json();
    },
    { fallbackData: initialData }
  );
  const [showTotals, setShowTotals] = useState(false);
  return (
    <main className="container mx-auto min-h-screen pt-32 px-4">
      <TransactionTable
        initialData={transactions}
        onUpdateRecordAction={async (records) => {
          const result = await onUpdateRecordAction(records);
          mutate(); // Refresca los datos después de actualizar
          return result;
        }}
        onToggleTotalsAction={() => setShowTotals((prev) => !prev)}
        showTotals={showTotals}
      />
    </main>
  );
}
