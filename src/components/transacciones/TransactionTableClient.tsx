'use client';

import { useState } from 'react';

import TransactionTable from '~/components/transacciones/TransactionTable';
import { useAppData } from '~/hooks/useAppData';

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
  const [showTotals, setShowTotals] = useState(false);

  const { data, mutate, isLoading } = useAppData(initialData);

  const handleUpdateRecords = async (records: TransactionRecord[]) => {
    const result = await onUpdateRecordAction(records);
    if (result.success) {
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
