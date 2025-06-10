'use client';

import { useState, useEffect, useMemo } from 'react';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import type { TransactionRecord } from '~/types';

interface SearchControlsProps {
  data: TransactionRecord[];
  onFilterAction: (results: TransactionRecord[]) => void;
  onDateFilterChangeAction: (
    startDate: Date | null,
    endDate: Date | null
  ) => void;
  onGenerateCuadreAction: (records: TransactionRecord[]) => void;
}

export default function SearchControls({
  data,
  onFilterAction,
  onDateFilterChangeAction,
  onGenerateCuadreAction,
}: SearchControlsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Memoize the filtering logic to prevent infinite loops
  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        Object.entries(item).some(([key, value]) => {
          if (key === 'fecha' || value === null) return false;
          return String(value).toLowerCase().includes(search);
        })
      );
    }

    return filtered;
  }, [data, searchTerm]);

  // Split the effects to avoid multiple state updates
  useEffect(() => {
    onFilterAction(filteredData);
  }, [filteredData, onFilterAction]);

  useEffect(() => {
    onDateFilterChangeAction(startDate, endDate);
  }, [startDate, endDate, onDateFilterChangeAction]);

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
          minDate={startDate ?? undefined}
          placeholderText="Fecha final"
          className="rounded-md border border-gray-300 px-3 py-2"
          dateFormat="dd/MM/yyyy"
        />
      </div>

      <button
        onClick={() => onGenerateCuadreAction(data)}
        className="ml-auto rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Generar Cuadre
      </button>
    </div>
  );
}
