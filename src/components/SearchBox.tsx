'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import type { TransactionRecord } from '~/types';

interface Props {
  onSearchAction: (results: TransactionRecord[]) => void;
  onGenerateCuadreAction: (selectedRecords: TransactionRecord[]) => void;
  data: TransactionRecord[];
}

export default function SearchBox({
  onSearchAction,
  onGenerateCuadreAction,
  data,
}: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlates, setSelectedPlates] = useState<Set<string>>(new Set());

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      onSearchAction(data);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const results = data.filter(
      (record) =>
        record.placa.toLowerCase().includes(searchTermLower) ||
        record.emitidoPor.toLowerCase().includes(searchTermLower) ||
        record.asesor.toLowerCase().includes(searchTermLower)
    );

    // If the search term exactly matches a plate, add it to selected plates
    const exactPlateMatch = results.find(
      (r) => r.placa.toLowerCase() === searchTermLower
    );
    if (exactPlateMatch) {
      setSelectedPlates((prev) => new Set([...prev, exactPlateMatch.placa]));
      setSearchTerm('');
    }

    onSearchAction(results);
  };

  const removeSelectedPlate = (plate: string) => {
    setSelectedPlates((prev) => {
      const next = new Set(prev);
      next.delete(plate);
      return next;
    });
  };

  const handleGenerateCuadre = () => {
    const selectedRecords = data.filter((record) =>
      selectedPlates.has(record.placa)
    );
    onGenerateCuadreAction(selectedRecords);
    // Navegar automáticamente a /cuadre después de generar
    router.push('/cuadre');
  };

  return (
    <div className="mb-4 space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          placeholder="Buscar por placa, emisor o asesor..."
          className="flex-1 rounded border px-4 py-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <button
          onClick={handleSearch}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Buscar
        </button>
      </div>

      {selectedPlates.size > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedPlates).map((plate) => (
              <span
                key={plate}
                className="inline-flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-sm"
              >
                {plate}
                <button
                  onClick={() => removeSelectedPlate(plate)}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={handleGenerateCuadre}
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Generar Cuadre ({selectedPlates.size})
          </button>
        </div>
      )}
    </div>
  );
}
