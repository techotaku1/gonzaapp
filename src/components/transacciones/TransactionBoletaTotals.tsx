'use client';

import { useMemo, useState } from 'react';

import { PiKeyReturnFill } from 'react-icons/pi';
import useSWR from 'swr';

import type { BoletaPaymentRecord } from '~/types';

export default function TransactionBoletaTotals({
  showTotals,
  onToggleTotalsAction,
  showMonthlyTotals,
  onToggleMonthlyTotalsAction,
  showBoletaTotals,
  onToggleBoletaTotalsAction,
  onBackToTableAction,
}: {
  showTotals?: boolean;
  onToggleTotalsAction?: () => void;
  showMonthlyTotals?: boolean;
  onToggleMonthlyTotalsAction?: () => void;
  showBoletaTotals?: boolean;
  onToggleBoletaTotalsAction?: () => void;
  onBackToTableAction?: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Local filter state (moved inside this component so buttons remain above this frontend)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const { data: boletaPayments = [], error } = useSWR<BoletaPaymentRecord[]>(
    '/api/boleta-payments',
    async (url: string) => {
      const res = await fetch(url);
      const data: unknown = await res.json();
      if (
        typeof data === 'object' &&
        data !== null &&
        'boletaPayments' in data &&
        Array.isArray((data as { boletaPayments: unknown }).boletaPayments)
      ) {
        return (data as { boletaPayments: BoletaPaymentRecord[] })
          .boletaPayments;
      }
      return [];
    }
  );

  const formatCurrency = useMemo(
    () => (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    },
    []
  );

  // Filtrado local: por referencia, placas (any placa includes) y por rango de fechas (YYYY-MM-DD)
  const filteredPayments = useMemo(() => {
    const s = (searchTerm ?? '').trim().toLowerCase();
    return boletaPayments.filter((p) => {
      // Fecha check
      if (startDate || endDate) {
        const fecha = p.fecha instanceof Date ? p.fecha : new Date(p.fecha);
        const iso = fecha.toISOString().slice(0, 10);
        if (startDate && iso < startDate) return false;
        if (endDate && iso > endDate) return false;
      }
      if (!s) return true;
      // Search in referencia, placas array, and createdByInitial
      const ref = String(p.boletaReferencia ?? '').toLowerCase();
      if (ref.includes(s)) return true;
      const creador = String(p.createdByInitial ?? '').toLowerCase();
      if (creador.includes(s)) return true;
      if (Array.isArray(p.placas)) {
        for (const pl of p.placas) {
          if (
            String(pl ?? '')
              .toLowerCase()
              .includes(s)
          )
            return true;
        }
      } else if (
        String(p.placas ?? '')
          .toLowerCase()
          .includes(s)
      ) {
        return true;
      }
      return false;
    });
  }, [boletaPayments, searchTerm, startDate, endDate]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage, itemsPerPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / itemsPerPage)
  );

  if (error) {
    return <div className="text-red-600">Error cargando datos de boletas.</div>;
  }

  // Handler unificado para "Volver a la tabla principal"
  const handleBack = () => {
    if (onBackToTableAction) {
      onBackToTableAction();
      return;
    }
    // Fallback: asegurar que todas las vistas de totales queden desactivadas
    if (showTotals && onToggleTotalsAction) onToggleTotalsAction();
    if (showMonthlyTotals && onToggleMonthlyTotalsAction)
      onToggleMonthlyTotalsAction();
    if (showBoletaTotals && onToggleBoletaTotalsAction)
      onToggleBoletaTotalsAction();
  };

  return (
    <div className="font-display container mx-auto px-6">
      {/* Botones de navegación entre totales - SIEMPRE arriba del frontend de búsqueda/rango */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            // Abrir Totales Diarios — preserva compatibilidad con callbacks externos
            if (onToggleTotalsAction) onToggleTotalsAction();
            if (showMonthlyTotals && onToggleMonthlyTotalsAction)
              onToggleMonthlyTotalsAction();
            if (showBoletaTotals && onToggleBoletaTotalsAction)
              onToggleBoletaTotalsAction();
          }}
          className={`h-10 rounded px-4 py-2 font-semibold transition-colors ${
            showTotals ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
          } hover:bg-blue-700 hover:text-white`}
        >
          Totales Diarios
        </button>
        <button
          type="button"
          onClick={() => {
            if (showTotals && onToggleTotalsAction) onToggleTotalsAction();
            if (onToggleMonthlyTotalsAction) onToggleMonthlyTotalsAction();
            if (showBoletaTotals && onToggleBoletaTotalsAction)
              onToggleBoletaTotalsAction();
          }}
          className={`h-10 rounded px-4 py-2 font-semibold transition-colors ${
            showMonthlyTotals
              ? 'bg-indigo-600 text-white'
              : 'bg-indigo-100 text-indigo-800'
          } hover:bg-indigo-700 hover:text-white`}
        >
          Totales Mensuales
        </button>
        <button
          type="button"
          onClick={() => {
            if (showTotals && onToggleTotalsAction) onToggleTotalsAction();
            if (showMonthlyTotals && onToggleMonthlyTotalsAction)
              onToggleMonthlyTotalsAction();
            if (onToggleBoletaTotalsAction) onToggleBoletaTotalsAction();
          }}
          className={`h-10 rounded px-4 py-2 font-semibold transition-colors ${
            showBoletaTotals
              ? 'bg-green-600 text-white'
              : 'bg-green-100 text-green-800'
          } hover:bg-green-700 hover:text-white`}
        >
          Totales Boletas
        </button>
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 items-center gap-2 rounded bg-gray-200 px-4 py-2 font-semibold text-gray-800 transition-colors hover:bg-gray-400 hover:text-white"
        >
          <PiKeyReturnFill className="text-xl" />
          Volver a la tabla principal
        </button>
      </div>

      {/* Frontend de búsqueda y rango de fechas (ahora gestionado aquí, debajo de los botones) */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow-md">
        <input
          type="text"
          placeholder="Buscar"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-64 rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          type="date"
          value={startDate ?? ''}
          onChange={(e) => {
            setStartDate(e.target.value ? e.target.value : null);
            setCurrentPage(1);
          }}
          className="w-40 rounded-md border border-gray-300 px-2 py-2"
          aria-label="Fecha inicial"
        />
        <input
          type="date"
          value={endDate ?? ''}
          onChange={(e) => {
            setEndDate(e.target.value ? e.target.value : null);
            setCurrentPage(1);
          }}
          className="w-40 rounded-md border border-gray-300 px-2 py-2"
          aria-label="Fecha final"
        />
        <button
          onClick={() => {
            setSearchTerm('');
            setStartDate(null);
            setEndDate(null);
            setCurrentPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          type="button"
        >
          Limpiar
        </button>
      </div>

      <h3 className="mb-2 text-4xl font-semibold">Totales Boletas Pagadas</h3>

      <div className="overflow-x-auto">
        <table className="w-full rounded-lg bg-white shadow-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-800 uppercase">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-800 uppercase">
                Referencia Boleta
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-800 uppercase">
                Placas
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold tracking-wider text-gray-800 uppercase">
                TOTAL EGRESOS
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold tracking-wider text-gray-800 uppercase">
                4x1000
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold tracking-wider text-gray-800 uppercase">
                TOTAL EGRESOS NETO
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-800 uppercase">
                Creador
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedPayments.map((payment) => {
              const totalEgresos = Number(payment.totalPrecioNeto);
              const impuesto4x1000 = Math.round(totalEgresos * 0.004);
              const egresosNeto = totalEgresos - impuesto4x1000;
              return (
                <tr
                  key={payment.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(payment.fecha).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.boletaReferencia}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {Array.isArray(payment.placas)
                      ? payment.placas.join(', ')
                      : String(payment.placas ?? '')}
                  </td>
                  <td className="px-6 py-4 text-right font-medium whitespace-nowrap text-green-600">
                    {formatCurrency(payment.totalPrecioNeto)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium whitespace-nowrap text-red-600">
                    {formatCurrency(impuesto4x1000)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium whitespace-nowrap text-blue-600">
                    {formatCurrency(egresosNeto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.createdByInitial ?? ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-sm font-medium text-gray-700">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
