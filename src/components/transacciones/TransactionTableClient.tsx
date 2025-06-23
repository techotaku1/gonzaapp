'use client';

import { useState } from 'react';

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
  const [showTotals, setShowTotals] = useState(false);
  return (
    <main className="container mx-auto min-h-screen pt-32 px-4">
      <TransactionTable
        initialData={initialData}
        onUpdateRecordAction={onUpdateRecordAction}
        onToggleTotalsAction={() => setShowTotals((prev) => !prev)}
        showTotals={showTotals}
      />
    </main>
  );
}
