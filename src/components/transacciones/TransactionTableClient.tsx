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
  const [userInteracted, setUserInteracted] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocus = () => setIsActive(true);
    const handleBlur = () => {
      // Don't immediately deactivate on blur
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        if (!userInteracted) {
          setIsActive(false);
        }
      }, 60000); // Wait a minute before disabling if user hasn't interacted
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setIsActive(true);
      } else {
        handleBlur(); // Use the same logic as blur
      }
    };

    const handleUserInteraction = () => {
      setUserInteracted(true);
      setIsActive(true);

      // Reset after a period of inactivity
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        setUserInteracted(false);
      }, 300000); // 5 minutes of inactivity resets interaction state
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    // Track user interactions to keep the tab active
    document.addEventListener('mousemove', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('scroll', handleUserInteraction);

    // Opcional: mouseover/mouseleave sobre la tabla
    const node = containerRef.current;
    if (node) {
      node.addEventListener('mouseenter', () => setIsActive(true));
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('mousemove', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (node) {
        node.removeEventListener('mouseenter', () => setIsActive(true));
      }
    };
  }, [userInteracted]);

  // Obtener la fecha de la primera fila (día actual de la página)
  const currentDate =
    initialData.length > 0
      ? (initialData[0].fecha instanceof Date
          ? initialData[0].fecha
          : new Date(initialData[0].fecha)
        )
          .toISOString()
          .slice(0, 10)
      : undefined;

  // Usa useAppData para obtener los datos optimizados y actualizados SOLO para la fecha actual
  const { data, mutate, isLoading } = useAppData(
    initialData,
    isActive,
    currentDate
  );

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
      <main
        className="container mx-auto min-h-screen px-4 pt-32"
        style={{
          height: 'auto',
          minHeight: '100vh',
          overflow: 'visible',
        }}
      >
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
