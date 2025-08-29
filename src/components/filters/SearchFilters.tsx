'use client';

import { useCallback, useMemo, useState } from 'react';

import Link from 'next/link';

import { es } from 'date-fns/locale';
import DatePicker from 'react-datepicker';

import { Icons } from '../icons';

import type { TransactionRecord } from '~/types';

import 'react-datepicker/dist/react-datepicker.css';

interface SearchControlsProps {
  data: TransactionRecord[];
  onFilterAction: (results: TransactionRecord[], searchTerm?: string) => void;
  onDateFilterChangeAction: (
    startDate: Date | null,
    endDate: Date | null
  ) => void;
  onToggleAsesorSelectionAction: () => Promise<void>;
  onGenerateCuadreAction: (records: TransactionRecord[]) => void;
  hasSearchResults: boolean;
  isAsesorSelectionMode: boolean;
  hasSelectedAsesores: boolean;
  isLoadingAsesorMode: boolean;
  searchTerm: string;
  setSearchTermAction: (value: string) => void;
  userRole?: 'admin' | 'empleado'; // NUEVO
}

interface RemoteSearchInputProps {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
  loading?: boolean;
}

const RemoteSearchInput: React.FC<
  RemoteSearchInputProps & { onClear?: () => void }
> = ({ value, onChange, onSearch, loading, onClear }) => (
  <div className="relative flex w-64 gap-2">
    <input
      type="text"
      className="w-50 rounded-md border border-gray-300 px-3 py-2 pr-8"
      placeholder="Buscar..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && value.trim()) onSearch();
      }}
    />
    {value && (
      <button
        type="button"
        aria-label="Limpiar búsqueda"
        className="absolute top-1/2 right-18 -translate-y-1/2 text-gray-400 hover:text-gray-700"
        onClick={() => {
          onChange('');
          if (onClear) onClear();
        }}
        tabIndex={-1}
        style={{ background: 'transparent', border: 'none', padding: 0 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    )}
    <button
      onClick={onSearch}
      className="ml-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      disabled={loading ?? !value.trim()}
      type="button"
    >
      {loading ? 'Buscando...' : 'Buscar'}
    </button>
  </div>
);

export default function SearchFilters({
  data,
  onFilterAction,
  onDateFilterChangeAction,
  onToggleAsesorSelectionAction,
  onGenerateCuadreAction,
  hasSearchResults,
  isAsesorSelectionMode,
  hasSelectedAsesores,
  isLoadingAsesorMode,
  setSearchTermAction,
  userRole, // NUEVO
}: SearchControlsProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCuadre, setIsGeneratingCuadre] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);

  // Estado para fechas filtradas
  const [filteredStartDate, setFilteredStartDate] = useState<Date | null>(null);
  const [filteredEndDate, setFilteredEndDate] = useState<Date | null>(null);

  // Nuevo estado para los datos filtrados
  const [_filteredData, _setFilteredData] = useState<TransactionRecord[]>(data); // prefijo _ para evitar warning

  // Estado para búsqueda remota
  const [remoteSearch, setRemoteSearch] = useState('');
  const [remoteLoading, setRemoteLoading] = useState(false);

  // Mueve la declaración de columnAliases aquí, antes de cualquier uso
  const columnAliases = useMemo(
    () =>
      ({
        asesor: 'asesor',
        nombre: 'nombre',
        tramite: 'tramite',
        placa: 'placa',
        ciudad: 'ciudad',
        novedad: 'novedad',
        creador: 'createdByInitial',
        creadopor: 'createdByInitial',
        creadoporinicial: 'createdByInitial',
        inicial: 'createdByInitial',
        tipo: 'tipoVehiculo',
        tipovehiculo: 'tipoVehiculo',
        documento: 'tipoDocumento',
        tipodocumento: 'tipoDocumento',
        numerodocumento: 'numeroDocumento',
        emitido: 'emitidoPor',
        emitidopor: 'emitidoPor',
        boleta: 'boleta',
        pagado: 'pagado',
        celular: 'celular',
        comision: 'comisionExtra',
        rappi: 'rappi',
        observaciones: 'observaciones',
        fecha: 'fecha',
      }) as Record<string, keyof TransactionRecord | 'createdByInitial'>,
    []
  );

  // --- NUEVO: Función para parsear el término de búsqueda ---
  function parseColumnSearch(term: string): { column?: string; value: string } {
    const match = /^\s*([^,]+)\s*,\s*(.+)$/i.exec(term);
    if (match) {
      return { column: match[1].trim().toLowerCase(), value: match[2].trim() };
    }
    return { value: term.trim() };
  }

  // Eliminar el useEffect que llama a onDateFilterChangeAction automáticamente
  // y solo llamar a onDateFilterChangeAction cuando el usuario hace clic en "Filtrar por Fechas"

  const handleDateRangeFilter = useCallback(() => {
    if (!startDate || !endDate) return;
    setIsLoading(true);
    setTimeout(() => {
      setFilteredStartDate(startDate);
      setFilteredEndDate(endDate);
      setIsLoading(false);
      // Llamar a la acción de filtro de fechas aquí
      onDateFilterChangeAction(startDate, endDate);
    }, 100);
  }, [startDate, endDate, onDateFilterChangeAction]);

  const handleClearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setFilteredStartDate(null);
    setFilteredEndDate(null);
    // Llama a la acción para limpiar el filtro global
    onDateFilterChangeAction(null, null);
  };

  const handleGenerateCuadre = useCallback(() => {
    setIsGeneratingCuadre(true);
    onGenerateCuadreAction(_filteredData);
    setShouldNavigate(true);
  }, [_filteredData, onGenerateCuadreAction]);

  // Solo actualizar el searchTerm global cuando el usuario hace clic en Buscar
  const handleRemoteSearch = useCallback(() => {
    setRemoteLoading(true);
    setSearchTermAction(remoteSearch);

    // --- NUEVO: Soporte para búsqueda por columna ---
    const { column, value } = parseColumnSearch(remoteSearch);
    let filtered: TransactionRecord[] = [];

    if (column && value) {
      // Buscar por columna específica: coincidencia exacta de todo el campo (case-insensitive, ignora espacios extra)
      const colKey = columnAliases[column] ?? column;
      const searchValue = value.trim().toLowerCase();
      filtered = data.filter((item) => {
        let fieldValue = '';
        if (colKey === 'createdByInitial') {
          fieldValue = (item.createdByInitial ?? '').toString();
        } else if (Object.prototype.hasOwnProperty.call(item, colKey)) {
          const v = item[colKey as keyof TransactionRecord];
          if (v === null || typeof v === 'undefined') return false;
          fieldValue = String(v);
        } else {
          return false;
        }
        // Compara el campo completo, ignorando mayúsculas/minúsculas y espacios extra
        return fieldValue.trim().toLowerCase() === searchValue;
      });
    } else {
      // Búsqueda general (todas las columnas, sigue siendo substring)
      filtered = data.filter((item) =>
        Object.entries(item).some(([key, v]) => {
          if (key === 'fecha' || v === null) return false;
          return String(v).toLowerCase().includes(remoteSearch.toLowerCase());
        })
      );
    }

    onFilterAction(filtered, remoteSearch);
    setTimeout(() => setRemoteLoading(false), 400); // Simula loading
  }, [remoteSearch, setSearchTermAction, data, onFilterAction, columnAliases]);

  const minDateValue = startDate ?? undefined;

  // Nueva función para limpiar búsqueda global y local
  const handleClearSearch = useCallback(() => {
    setRemoteSearch('');
    setSearchTermAction('');
  }, [setSearchTermAction]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow-md">
      <div className="flex flex-1 items-center gap-2">
        <RemoteSearchInput
          value={remoteSearch}
          onChange={setRemoteSearch}
          onSearch={handleRemoteSearch}
          loading={remoteLoading}
          onClear={handleClearSearch}
        />
      </div>
      <div className="flex items-center gap-2">
        {/* Fecha inicial */}
        <div className="relative">
          <DatePicker
            selected={startDate}
            onChange={(date: Date | null) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Fecha inicial"
            className="w-36 rounded-md border border-gray-300 px-3 py-2 pr-8" // ancho reducido
            dateFormat="dd/MM/yyyy"
            locale={es}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </span>
        </div>
        {/* Fecha final */}
        <div className="relative">
          <DatePicker
            selected={endDate}
            onChange={(date: Date | null) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={minDateValue}
            placeholderText="Fecha final"
            className="w-36 rounded-md border border-gray-300 px-3 py-2 pr-8" // ancho reducido
            dateFormat="dd/MM/yyyy"
            locale={es}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </span>
        </div>
        <button
          onClick={handleDateRangeFilter}
          disabled={isLoading || !startDate || !endDate}
          className="-mr-2 flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-50"
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
        {(filteredStartDate ?? filteredEndDate) && !isLoading ? (
          <button
            onClick={handleClearDateFilter}
            className="-mr-2 ml-2 rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
          >
            Limpiar Filtro
          </button>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {/* SOLO mostrar estos botones si el rol NO es empleado */}
        {userRole !== 'empleado' && (
          <>
            <button
              onClick={onToggleAsesorSelectionAction}
              disabled={!hasSearchResults || isLoadingAsesorMode}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-white transition-all ${
                hasSearchResults
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'cursor-not-allowed bg-gray-400'
              }`}
            >
              {isLoadingAsesorMode ? (
                <>
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                  <span>Cargando...</span>
                </>
              ) : (
                <span>
                  {isAsesorSelectionMode
                    ? 'Cancelar Selección'
                    : 'Seleccionar por Asesor'}
                </span>
              )}
            </button>
            {shouldNavigate ? (
              <Link
                href="/cuadre"
                className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                prefetch={false}
              >
                <Icons.spinner className="h-4 w-4 animate-spin" />
                <span>Redirigiendo...</span>
              </Link>
            ) : (
              <button
                onClick={handleGenerateCuadre}
                disabled={!hasSelectedAsesores || isGeneratingCuadre}
                className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {isGeneratingCuadre ? (
                  <>
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : (
                  <span>Generar Cuadre</span>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
