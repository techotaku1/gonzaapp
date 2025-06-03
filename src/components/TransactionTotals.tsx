'use client';

import { useState, useMemo } from 'react';

import { calculateFormulas } from '~/utils/formulas';

import type { TransactionRecord } from '~/types';

interface TotalsByDate {
  date: string;
  precioNetoTotal: number;
  impuesto4x1000Total: number;
  gananciaBrutaTotal: number;
  transactionCount: number;
}

export default function TransactionTotals({
  transactions,
}: {
  transactions: TransactionRecord[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totals = useMemo(() => {
    const totalsByDate = new Map<string, TotalsByDate>();
    const COMISION_EXTRA = 30000;

    transactions.forEach((transaction) => {
      if (!(transaction.fecha instanceof Date)) return;

      // Convert to Colombia timezone
      const dateInColombia = new Date(
        transaction.fecha.toLocaleString('en-US', { timeZone: 'America/Bogota' })
      );
      const dateStr = dateInColombia.toISOString().split('T')[0];
      if (!dateStr) return;

      const current = totalsByDate.get(dateStr) ?? {
        date: dateStr,
        precioNetoTotal: 0,
        impuesto4x1000Total: 0,
        gananciaBrutaTotal: 0,
        transactionCount: 0,
      };

      // Calcular las fórmulas para cada transacción
      const { impuesto4x1000, gananciaBruta } = calculateFormulas(transaction);

      // Añadir comisión extra si está marcada
      const precioNetoConComision = transaction.comisionExtra
        ? (transaction.precioNeto ?? 0) + COMISION_EXTRA
        : (transaction.precioNeto ?? 0);

      const updatedTotal = {
        ...current,
        precioNetoTotal: current.precioNetoTotal + precioNetoConComision,
        impuesto4x1000Total:
          current.impuesto4x1000Total + (impuesto4x1000 ?? 0),
        gananciaBrutaTotal: current.gananciaBrutaTotal + (gananciaBruta ?? 0),
        transactionCount: current.transactionCount + 1,
      };

      totalsByDate.set(dateStr, updatedTotal);
    });

    return Array.from(totalsByDate.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [transactions]);

  const totalPages = Math.ceil(totals.length / itemsPerPage);
  const paginatedTotals = totals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (amount: number) => {
    // Redondear al entero más cercano
    const roundedAmount = Math.round(amount);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(roundedAmount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Create date in Colombia timezone maintaining the day
      const colombiaDate = new Date(
        date.toLocaleString('en-US', { timeZone: 'America/Bogota' })
      );
      colombiaDate.setMinutes(colombiaDate.getMinutes() + colombiaDate.getTimezoneOffset());

      const formatted = new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Bogota',
      }).format(colombiaDate);

      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Calcular totales generales
  const grandTotals = useMemo(() => {
    return totals.reduce(
      (acc, curr) => ({
        precioNetoTotal: acc.precioNetoTotal + curr.precioNetoTotal,
        impuesto4x1000Total: acc.impuesto4x1000Total + curr.impuesto4x1000Total,
        gananciaBrutaTotal: acc.gananciaBrutaTotal + curr.gananciaBrutaTotal,
        transactionCount: acc.transactionCount + curr.transactionCount,
      }),
      {
        precioNetoTotal: 0,
        impuesto4x1000Total: 0,
        gananciaBrutaTotal: 0,
        transactionCount: 0,
      }
    );
  }, [totals]);

  return (
    <div className="font-display container mx-auto p-6">
      <h2 className="mb-6 text-2xl font-bold">Totales por Fecha</h2>

      {/* Totales generales con colores e iconos */}
      <div className="mb-8 rounded-lg bg-gray-100 p-6">
        <h3 className="mb-4 text-xl font-semibold">Totales Generales</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow transition-transform hover:scale-105">
            <div className="text-sm text-gray-600">Total Transacciones</div>
            <div className="text-xl font-bold text-blue-600">
              {grandTotals.transactionCount}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow transition-transform hover:scale-105">
            <div className="text-sm text-gray-600">Precio Neto Total</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(grandTotals.precioNetoTotal)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow transition-transform hover:scale-105">
            <div className="text-sm text-gray-600">4x1000 Total</div>
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(grandTotals.impuesto4x1000Total)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow transition-transform hover:scale-105">
            <div className="text-sm text-gray-600">Ganancia Bruta Total</div>
            <div className="text-xl font-bold text-purple-600">
              {formatCurrency(grandTotals.gananciaBrutaTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla mejorada con colores para los valores */}
      <div className="overflow-x-auto">
        <table className="w-full rounded-lg bg-white shadow-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Fecha
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                Transacciones
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                Precio Neto
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                4x1000
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                Ganancia Bruta
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedTotals.map((total) => (
              <tr
                key={total.date}
                className="transition-colors hover:bg-gray-50"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDate(total.date)}
                </td>
                <td className="px-6 py-4 text-right font-medium whitespace-nowrap text-blue-600">
                  {total.transactionCount}
                </td>
                <td className="px-6 py-4 text-right font-medium whitespace-nowrap text-green-600">
                  {formatCurrency(total.precioNetoTotal)}
                </td>
                <td className="px-6 py-4 text-right font-medium whitespace-nowrap text-red-600">
                  {formatCurrency(total.impuesto4x1000Total)}
                </td>
                <td className="px-6 py-4 text-right font-medium whitespace-nowrap text-purple-600">
                  {formatCurrency(total.gananciaBrutaTotal)}
                </td>
              </tr>
            ))}
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
