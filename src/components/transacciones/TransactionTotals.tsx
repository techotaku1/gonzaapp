'use client';

import { useCallback, useMemo, useState } from 'react';

import { calculateFormulas } from '~/utils/formulas';

import type { TransactionRecord } from '~/types';

interface TotalsByDate {
  date: string;
  precioNetoTotal: number;
  tarifaServicioTotal: number;
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

  // Estado para filtro de búsqueda y fechas en la vista de totales
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Declarar formatDate antes de los useMemo y envolver en useCallback
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      // Create date in Colombia timezone maintaining the day
      const colombiaDate = new Date(
        date.toLocaleString('en-US', { timeZone: 'America/Bogota' })
      );
      colombiaDate.setMinutes(
        colombiaDate.getMinutes() + colombiaDate.getTimezoneOffset()
      );

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
  }, []);

  // Declarar formatCurrency antes de los useMemo y envolver en useCallback
  const formatCurrency = useCallback((amount: number) => {
    // Redondear al entero más cercano
    const roundedAmount = Math.round(amount);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(roundedAmount);
  }, []);

  // Función para normalizar texto: quita tildes, signos, puntos, comas, espacios y pasa a minúsculas
  const normalizeText = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita tildes
      .replace(/[$.,\-\s]/g, '') // quita $, puntos, comas, guiones, espacios
      .toLowerCase();

  // Filtrar transacciones por búsqueda y rango de fechas
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((t) =>
        Object.entries(t).some(([key, value]) => {
          if (key === 'fecha' || value === null) return false;
          return String(value).toLowerCase().includes(search);
        })
      );
    }
    if (startDate && endDate) {
      const start = startDate.setHours(0, 0, 0, 0);
      const end = endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => {
        const tDate = new Date(t.fecha).getTime();
        return tDate >= start && tDate <= end;
      });
    }
    return filtered;
  }, [transactions, searchTerm, startDate, endDate]);

  const totals = useMemo(() => {
    const totalsByDate = new Map<string, TotalsByDate>();
    const COMISION_EXTRA = 30000;

    filteredTransactions.forEach((transaction) => {
      if (!(transaction.fecha instanceof Date)) return;

      const dateInColombia = new Date(
        transaction.fecha.toLocaleString('en-US', {
          timeZone: 'America/Bogota',
        })
      );
      const dateStr = dateInColombia.toISOString().split('T')[0];
      if (!dateStr) return;

      const current = totalsByDate.get(dateStr) ?? {
        date: dateStr,
        precioNetoTotal: 0,
        tarifaServicioTotal: 0,
        impuesto4x1000Total: 0,
        gananciaBrutaTotal: 0,
        transactionCount: 0,
      };

      // Calcular las fórmulas para cada transacción y usar tarifaServicioAjustada
      const { tarifaServicioAjustada, impuesto4x1000, gananciaBruta } =
        calculateFormulas(transaction);

      // Añadir comisión extra si está marcada
      const precioNetoConComision = transaction.comisionExtra
        ? (transaction.precioNeto ?? 0) + COMISION_EXTRA
        : (transaction.precioNeto ?? 0);

      const updatedTotal = {
        ...current,
        precioNetoTotal: current.precioNetoTotal + precioNetoConComision,
        tarifaServicioTotal:
          current.tarifaServicioTotal + (tarifaServicioAjustada ?? 0),
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
  }, [filteredTransactions]);

  // Filtrar totales por búsqueda y rango de fechas
  const filteredTotals = useMemo(() => {
    // Declarar columnKeywords dentro del useMemo para evitar advertencias de dependencias
    const columnKeywords = [
      {
        key: 'fecha',
        keywords: [
          'fecha',
          'día',
          'dia',
          'semana',
          'mes',
          'año',
          'ano',
          'lunes',
          'martes',
          'miércoles',
          'miercoles',
          'jueves',
          'viernes',
          'sábado',
          'sabado',
          'domingo',
          'enero',
          'febrero',
          'marzo',
          'abril',
          'mayo',
          'junio',
          'julio',
          'agosto',
          'septiembre',
          'octubre',
          'noviembre',
          'diciembre',
        ],
      },
      {
        key: 'transactionCount',
        keywords: ['transacciones', 'cantidad', 'numero', 'número'],
      },
      { key: 'precioNetoTotal', keywords: ['precio neto', 'neto', 'precio'] },
      {
        key: 'tarifaServicioTotal',
        keywords: ['tarifa servicio', 'tarifa', 'servicio'],
      },
      {
        key: 'impuesto4x1000Total',
        keywords: ['4x1000', 'impuesto', 'cuatro', 'mil'],
      },
      {
        key: 'gananciaBrutaTotal',
        keywords: ['ganancia bruta', 'ganancia', 'bruta'],
      },
    ];
    let filtered = totals;
    if (searchTerm) {
      const search = normalizeText(searchTerm);
      // Detectar si el usuario busca por columna específica
      const column = columnKeywords.find((col) =>
        col.keywords.some((k) => search.includes(normalizeText(k)))
      );
      filtered = filtered.filter((t) => {
        const dateStr = normalizeText(formatDate(t.date));
        const transactionCount = normalizeText(String(t.transactionCount));
        const precioNeto = normalizeText(formatCurrency(t.precioNetoTotal));
        const tarifaServicio = normalizeText(
          formatCurrency(t.tarifaServicioTotal)
        );
        const impuesto4x1000 = normalizeText(
          formatCurrency(t.impuesto4x1000Total)
        );
        const gananciaBruta = normalizeText(
          formatCurrency(t.gananciaBrutaTotal)
        );
        // Si busca por columna específica
        if (column) {
          switch (column.key) {
            case 'fecha':
              return dateStr.includes(search);
            case 'transactionCount':
              return transactionCount.includes(search);
            case 'precioNetoTotal':
              return precioNeto.includes(search);
            case 'tarifaServicioTotal':
              return tarifaServicio.includes(search);
            case 'impuesto4x1000Total':
              return impuesto4x1000.includes(search);
            case 'gananciaBrutaTotal':
              return gananciaBruta.includes(search);
            default:
              return false;
          }
        }
        // Si busca un número, buscar en todos los valores numéricos
        if (/\d/.test(search)) {
          return (
            transactionCount.includes(search) ||
            precioNeto.includes(search) ||
            tarifaServicio.includes(search) ||
            impuesto4x1000.includes(search) ||
            gananciaBruta.includes(search)
          );
        }
        // Si busca una palabra, buscar en todas las columnas visibles
        return (
          dateStr.includes(search) ||
          transactionCount.includes(search) ||
          precioNeto.includes(search) ||
          tarifaServicio.includes(search) ||
          impuesto4x1000.includes(search) ||
          gananciaBruta.includes(search)
        );
      });
    }
    if (startDate && endDate) {
      const start = startDate.setHours(0, 0, 0, 0);
      const end = endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => {
        const tDate = new Date(t.date).getTime();
        return tDate >= start && tDate <= end;
      });
    }
    return filtered;
  }, [totals, searchTerm, startDate, endDate, formatDate, formatCurrency]);

  const totalPages = Math.ceil(filteredTotals.length / itemsPerPage);
  const paginatedTotals = filteredTotals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calcular totales generales
  const grandTotals = useMemo(() => {
    return totals.reduce(
      (acc, curr) => ({
        precioNetoTotal: acc.precioNetoTotal + curr.precioNetoTotal,
        tarifaServicioTotal: acc.tarifaServicioTotal + curr.tarifaServicioTotal,
        impuesto4x1000Total: acc.impuesto4x1000Total + curr.impuesto4x1000Total,
        gananciaBrutaTotal: acc.gananciaBrutaTotal + curr.gananciaBrutaTotal,
        transactionCount: acc.transactionCount + curr.transactionCount,
      }),
      {
        precioNetoTotal: 0,
        tarifaServicioTotal: 0,
        impuesto4x1000Total: 0,
        gananciaBrutaTotal: 0,
        transactionCount: 0,
      }
    );
  }, [totals]);

  return (
    <div className="font-display container mx-auto px-6">
      {/* Texto Totales Generales fuera del rectángulo */}
      <h3 className="mb-2 text-4xl font-semibold">Totales Generales</h3>
      {/* Totales generales con colores e iconos */}
      <div className="mb-6 rounded-lg bg-gray-100 p-6">
        <div className="grid grid-cols-2 gap-4 font-bold md:grid-cols-5">
          <div className="rounded-lg bg-white p-4 shadow transition-transform hover:scale-105">
            <div className="text-sm text-gray-800">Total Transacciones</div>
            <div className="text-xl font-bold text-blue-600">
              {grandTotals.transactionCount}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow transition-transform hover:scale-105">
            <div className="text-sm text-gray-800">Precio Neto Total</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(grandTotals.precioNetoTotal)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow transition-transform hover:scale-105">
            <div className="text-sm text-gray-800">Tarifa Servicio Total</div>
            <div className="text-xl font-bold text-orange-600">
              {formatCurrency(grandTotals.tarifaServicioTotal)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow transition-transform hover:scale-105">
            <div className="text-sm text-gray-800">4x1000 Total</div>
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(grandTotals.impuesto4x1000Total)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow transition-transform hover:scale-105">
            <div className="text-sm text-gray-800">Ganancia Bruta Total</div>
            <div className="text-xl font-bold text-purple-600">
              {formatCurrency(grandTotals.gananciaBrutaTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtro por rango para totales, ahora debajo de Totales Generales */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow-md">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          type="date"
          value={startDate ? startDate.toISOString().slice(0, 10) : ''}
          onChange={(e) =>
            setStartDate(e.target.value ? new Date(e.target.value) : null)
          }
          className="rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          type="date"
          value={endDate ? endDate.toISOString().slice(0, 10) : ''}
          onChange={(e) =>
            setEndDate(e.target.value ? new Date(e.target.value) : null)
          }
          className="rounded-md border border-gray-300 px-3 py-2"
        />
        {(startDate ?? endDate) && (
          <button
            onClick={() => {
              setStartDate(null);
              setEndDate(null);
            }}
            className="rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
          >
            Limpiar Fechas
          </button>
        )}
      </div>

      {/* Tabla mejorada con colores para los valores */}
      <div className="overflow-x-auto">
        <table className="w-full rounded-lg bg-white shadow-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                Fecha
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold tracking-wider text-gray-500 uppercase">
                Transacciones
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold tracking-wider text-gray-800 uppercase">
                Precio Neto
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold tracking-wider text-gray-800 uppercase">
                Tarifa Servicio
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold tracking-wider text-gray-800 uppercase">
                4x1000
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold tracking-wider text-gray-800 uppercase">
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
                <td className="px-6 py-4 text-right font-medium whitespace-nowrap text-orange-600">
                  {formatCurrency(total.tarifaServicioTotal)}
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
