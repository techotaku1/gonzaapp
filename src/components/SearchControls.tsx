'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

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
  const [isLoading, setIsLoading] = useState(false);

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

  // Modified handleDateRangeFilter to remove async and handle dates properly
  const handleDateRangeFilter = useCallback(() => {
    if (!startDate || !endDate) return;

    setIsLoading(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Usar setTimeout para permitir que el UI se actualice
      setTimeout(() => {
        onDateFilterChangeAction(start, end);
        setIsLoading(false);
      }, 100);
    } catch (error) {
      console.error('Error filtering dates:', error);
      setIsLoading(false);
    }
  }, [startDate, endDate, onDateFilterChangeAction]);

  // Add minDate handling
  const minDateValue = startDate ?? undefined;

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
          onChange={(date: Date | null) => setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          placeholderText="Fecha inicial"
          className="rounded-md border border-gray-300 px-3 py-2"
          dateFormat="dd/MM/yyyy"
        />
        <DatePicker
          selected={endDate}
          onChange={(date: Date | null) => setEndDate(date)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={minDateValue}
          placeholderText="Fecha final"
          className="rounded-md border border-gray-300 px-3 py-2"
          dateFormat="dd/MM/yyyy"
        />
        <button
          onClick={handleDateRangeFilter}
          disabled={isLoading || !startDate || !endDate}
          className="flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Cargando...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Filtrar por Fechas</span>
            </>
          )}
        </button>
        {(startDate ?? endDate) && !isLoading && (
          <button
            onClick={() => {
              setStartDate(null);
              setEndDate(null);
              onDateFilterChangeAction(null, null);
            }}
            className="rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
          >
            Limpiar Filtro
          </button>
        )}
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
