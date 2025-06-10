'use client';

import { useState, useEffect } from 'react';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import type { TransactionRecord } from '~/types';

interface SearchControlsProps {
  data: TransactionRecord[];
  onFilterAction: (results: TransactionRecord[]) => void;
  onGenerateCuadreAction: (records: TransactionRecord[]) => void;
}

export default function SearchControls({
  data,
  onFilterAction,
  onGenerateCuadreAction,
}: SearchControlsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Efecto para aplicar los filtros en tiempo real
  useEffect(() => {
    let filtered = [...data];

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(search)
        )
      );
    }

    // Filtrar por rango de fechas
    if (startDate && endDate) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.fecha);
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Ajustar las fechas para ignorar las horas
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return itemDate >= start && itemDate <= end;
      });
    }

    onFilterAction(filtered);
  }, [data, searchTerm, startDate, endDate, onFilterAction]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow-md">
      <div className="flex flex-1 items-center gap-2">
        <input
          type="text"
          placeholder="Buscar en cualquier campo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-2">
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          placeholderText="Fecha inicial"
          className="rounded-md border border-gray-300 px-3 py-2"
          dateFormat="dd/MM/yyyy"
        />
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate ?? undefined} // Fix: Convert null to undefined
          placeholderText="Fecha final"
          className="rounded-md border border-gray-300 px-3 py-2"
          dateFormat="dd/MM/yyyy"
        />
      </div>

      <button
        onClick={() => onGenerateCuadreAction(data)}
        disabled={!startDate || !endDate}
        className="ml-auto rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
      >
        Generar Cuadre
      </button>
    </div>
  );
}
