'use client';

import { useEffect, useRef, useState } from 'react';

import { Bell } from 'lucide-react'; // Agrega este import para el icono de campana
import useSWR from 'swr';

import { Icons } from '~/components/icons'; // Asegúrate de importar los iconos
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
  const [showMonthlyTotals, setShowMonthlyTotals] = useState(false);

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

  // --- NUEVO: Detectar filas con boleta!==true o pagado!==true y guardar placas ---
  const [showNotification, setShowNotification] = useState(false);
  const [notificationList, setNotificationList] = useState<
    { placa: string; fecha: Date }[]
  >([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false); // NUEVO

  // SWR para placas ignoradas
  const { data: ignoredPlates = [], mutate: mutateIgnoredPlates } = useSWR<
    string[]
  >('/api/ignored-plates', async (url: string) => {
    const res = await fetch(url);
    const data: unknown = await res.json();
    if (
      typeof data === 'object' &&
      data !== null &&
      'placas' in data &&
      Array.isArray((data as { placas: unknown }).placas)
    ) {
      return (data as { placas: unknown[] }).placas.filter(
        (p): p is string => typeof p === 'string'
      );
    }
    return [];
  });

  useEffect(() => {
    // Fecha mínima: domingo, 10 de agosto de 2025
    const minDate = new Date('2025-08-10T00:00:00-05:00');
    const pendientes = (data ?? initialData)
      .filter((row) => {
        // Solo placas válidas y desde la fecha mínima
        const fecha =
          row.fecha instanceof Date ? row.fecha : new Date(row.fecha);
        return (
          (row.boleta !== true || row.pagado !== true) &&
          row.placa &&
          typeof row.placa === 'string' &&
          row.placa.trim() !== '' &&
          fecha >= minDate &&
          !ignoredPlates.includes(row.placa.toUpperCase())
        );
      })
      .sort((a, b) => {
        const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
        const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
        return fechaB.getTime() - fechaA.getTime();
      })
      .map((row) => ({
        placa: row.placa!.toUpperCase(),
        fecha: row.fecha instanceof Date ? row.fecha : new Date(row.fecha),
      }));
    setShowNotification(pendientes.length > 0);
    setNotificationList(pendientes);
  }, [data, initialData, ignoredPlates]);

  // --- NUEVO: Cerrar lista al hacer click fuera ---
  useEffect(() => {
    if (!notificationOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const notif = document.getElementById('notification-bell-list');
      if (notif && !notif.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationOpen]);

  // --- NUEVO: Handler para abrir/cerrar la lista con loading spinner ---
  const handleNotificationClick = () => {
    if (!notificationOpen) {
      setNotificationLoading(true);
      setNotificationOpen(true);
      setTimeout(() => {
        setNotificationLoading(false);
      }, 400); // Simula carga, puedes ajustar el tiempo si lo deseas
    } else {
      setNotificationOpen(false);
    }
  };

  // Ref para exponer función de scroll/select a la tabla principal
  const tableRef = useRef<{ scrollToPlaca: (placa: string) => void } | null>(
    null
  );

  // Handler para ir a la placa en la tabla principal
  const handleGoToPlaca = (placa: string) => {
    // Llama a la función expuesta por la tabla
    tableRef.current?.scrollToPlaca(placa);
    setNotificationOpen(false);
  };

  // Handler para ignorar placa
  const handleIgnorePlaca = async (placa: string) => {
    await fetch('/api/ignored-plates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placa }),
    });
    mutateIgnoredPlates();
  };

  return (
    <SWRProvider active={isActive}>
      <div ref={containerRef} className="fixed top-0 left-0 z-50 w-full">
        {/* <Header /> */}
        {/* --- Notificación con campanita, badge y lista tipo hamburguesa --- */}
        {showNotification && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 24,
              zIndex: 100,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{ position: 'relative' }}
              title="Faltan boletas o pagos"
            >
              {/* Badge más arriba de la campana */}
              {notificationList.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -12,
                    right: -8,
                    background: '#f59e42',
                    color: 'white',
                    borderRadius: '50%',
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 20,
                    minHeight: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                    border: '2px solid #fff',
                    zIndex: 2,
                  }}
                >
                  {notificationList.length}
                </span>
              )}
              <Bell
                className={
                  notificationOpen
                    ? 'animate-bounce text-yellow-500'
                    : 'text-yellow-500'
                }
                size={22}
                onClick={handleNotificationClick}
                style={{ transition: 'transform 0.2s' }}
              />
              {/* --- Menú hamburguesa debajo de la campana --- */}
              {notificationOpen && (
                <div
                  id="notification-bell-list"
                  style={{
                    position: 'absolute',
                    top: 32,
                    right: 0,
                    minWidth: 260,
                    background: 'white',
                    border: '1px solid #fbbf24',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    padding: '12px 8px',
                    zIndex: 9999,
                  }}
                >
                  {notificationLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Icons.spinner className="h-8 w-8 text-yellow-500" />
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 font-bold text-yellow-700">
                        Placas Por Pagar:
                      </div>
                      <ul className="max-h-64 overflow-y-auto">
                        {notificationList.map((item, idx) => (
                          <li
                            key={item.placa + idx}
                            className="flex cursor-pointer flex-col rounded px-2 py-1 font-mono text-gray-800 hover:bg-yellow-50"
                            onClick={() => handleGoToPlaca(item.placa)}
                            tabIndex={0}
                            style={{ outline: 'none' }}
                          >
                            <span className="flex items-center justify-between text-base font-bold text-gray-900">
                              {item.placa}
                              <button
                                className="ml-2 text-xs text-red-500 underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleIgnorePlaca(item.placa);
                                }}
                                title="Ignorar esta placa"
                              >
                                Ignorar
                              </button>
                            </span>
                            <span className="text-xs text-gray-500">
                              {item.fecha instanceof Date &&
                              !isNaN(item.fecha.getTime())
                                ? item.fecha.toLocaleString('es-CO', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                    timeZone: 'America/Bogota',
                                  })
                                : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <button
                        className="mt-3 w-full rounded bg-yellow-400 py-1 font-semibold text-white hover:bg-yellow-500"
                        onClick={() => setNotificationOpen(false)}
                      >
                        Cerrar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Texto eliminado, solo campana y número */}
          </div>
        )}
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
          ref={tableRef}
          initialData={data ?? []}
          onUpdateRecordAction={handleUpdateRecords}
          onToggleTotalsAction={() => {
            setShowTotals((prev) => !prev);
          }}
          showTotals={showTotals}
          showMonthlyTotals={showMonthlyTotals}
          onToggleMonthlyTotalsAction={() => {
            setShowMonthlyTotals((prev) => !prev);
            if (showTotals) {
              setShowTotals(false);
            }
          }}
          isLoading={isLoading}
        />
      </main>
    </SWRProvider>
  );
}
