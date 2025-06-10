'use client';

import { useState, useCallback } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import type { TransactionRecord } from '~/types';

interface TableFiltersProps {
  data: TransactionRecord[];
  onFilterChangeAction: (filteredData: TransactionRecord[]) => void;
  onGenerateCuadreAction: (records: TransactionRecord[]) => void;
}

export default function TableFilters({
  data,
  onFilterChangeAction,
  onGenerateCuadreAction,
}: TableFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedAsesores, setSelectedAsesores] = useState<string[]>([]);

  // Get unique asesor values
  const asesores = Array.from(new Set(data.map((item) => item.asesor))).filter(
    Boolean
  );

  const updateSearchParams = useCallback(
    (search: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) {
        params.set('search', search);
      } else {
        params.delete('search');
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const applyFilters = useCallback(() => {
    let filtered = [...data];
    const search = searchParams.get('search')?.toLowerCase();

    if (search) {
      filtered = filtered.filter((item) => {
        return (
          item.placa.toLowerCase().includes(search) ||
          item.nombre.toLowerCase().includes(search) ||
          item.numeroDocumento.toLowerCase().includes(search)
        );
      });
    }

    if (startDate && endDate) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.fecha);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    if (selectedAsesores.length > 0) {
      filtered = filtered.filter((item) =>
        selectedAsesores.includes(item.asesor)
      );
    }

    onFilterChangeAction(filtered);
  }, [
    data,
    searchParams,
    startDate,
    endDate,
    selectedAsesores,
    onFilterChangeAction,
  ]);

  const handleGenerateCuadre = () => {
    let recordsToExport = [...data];

    if (selectedAsesores.length > 0) {
      recordsToExport = recordsToExport.filter((item) =>
        selectedAsesores.includes(item.asesor)
      );
    }

    if (startDate && endDate) {
      recordsToExport = recordsToExport.filter((item) => {
        const itemDate = new Date(item.fecha);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    onGenerateCuadreAction(recordsToExport);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow-md">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por placa, nombre o documento..."
          value={searchParams.get('search') ?? ''}
          onChange={(e) => {
            updateSearchParams(e.target.value);
            applyFilters();
          }}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-2">
        <DatePicker
          selected={startDate}
          onChange={(date) => {
            setStartDate(date);
            applyFilters();
          }}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          placeholderText="Fecha inicial"
          className="rounded-md border border-gray-300 px-3 py-2"
        />
        <DatePicker
          selected={endDate}
          onChange={(date) => {
            setEndDate(date);
            applyFilters();
          }}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          placeholderText="Fecha final"
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {asesores.map((asesor) => (
          <label key={asesor} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={selectedAsesores.includes(asesor)}
              onChange={(e) => {
                setSelectedAsesores(
                  e.target.checked
                    ? [...selectedAsesores, asesor]
                    : selectedAsesores.filter((a) => a !== asesor)
                );
                applyFilters();
              }}
              className="rounded border-gray-300"
            />
            <span className="text-sm">{asesor}</span>
          </label>
        ))}
      </div>

      <button
        onClick={handleGenerateCuadre}
        disabled={!selectedAsesores.length && !startDate && !endDate}
        className="ml-auto rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
      >
        Generar Cuadre
      </button>
    </div>
  );
}
