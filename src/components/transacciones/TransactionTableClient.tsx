'use client';

import { useEffect, useRef, useState } from 'react';

import { SWRProvider } from '~/components/swr/SWRProvider';
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

  // --- NUEVO: Estado para controlar si la tabla está activa ---
  const [isActive, setIsActive] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocus = () => setIsActive(true);
    const handleBlur = () => setIsActive(false);
    const handleVisibility = () =>
      setIsActive(document.visibilityState === 'visible');
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    // Opcional: mouseover/mouseleave sobre la tabla
    const node = containerRef.current;
    if (node) {
      node.addEventListener('mouseenter', () => setIsActive(true));
      node.addEventListener('mouseleave', () => setIsActive(false));
    }
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (node) {
        node.removeEventListener('mouseenter', () => setIsActive(true));
        node.removeEventListener('mouseleave', () => setIsActive(false));
      }
    };
  }, []);

  // Usa useAppData para obtener los datos optimizados y actualizados
  const { data, mutate, isLoading } = useAppData(initialData, isActive);

  const handleUpdateRecords = async (records: TransactionRecord[]) => {
    const result = await onUpdateRecordAction(records);
    if (result.success) {
      await mutate();
    }
    return result;
  };

  return (
    <SWRProvider active={isActive}>
      <div ref={containerRef} className="fixed top-0 left-0 z-50 w-full">
        {/* <Header /> */}
      </div>
      <main className="container mx-auto min-h-screen px-4 pt-32">
        <TransactionTable
          initialData={data ?? []}
          onUpdateRecordAction={handleUpdateRecords}
          onToggleTotalsAction={() => setShowTotals((prev) => !prev)}
          showTotals={showTotals}
          isLoading={isLoading}
        />
      </main>
    </SWRProvider>
  );
}
