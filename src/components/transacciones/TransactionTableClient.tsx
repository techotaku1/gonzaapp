'use client';

import { useState } from 'react';

import TransactionTable from '~/components/transacciones/TransactionTable';
import { useAppData } from '~/hooks/useAppData';

import type { TransactionRecord } from '~/types';

export default function TransactionTableClient({
  onUpdateRecordAction,
}: {
  onUpdateRecordAction: (
    records: TransactionRecord[]
  ) => Promise<{ success: boolean; error?: string }>;
}) {
  const [showTotals, setShowTotals] = useState(false);

  // Usa el hook global de datos SWR
  const { data, isLoading } = useAppData(); // <-- Elimina initialData

  // Cuando guardes, actualiza el caché SWR global y revalida para todos los dispositivos
  const handleUpdateRecords = async (records: TransactionRecord[]) => {
    const result = await onUpdateRecordAction(records);
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
