'use client';

import React from 'react'; // Elimina useEffect y useState si no se usan directamente aquí;

import { useRouter } from '@bprogress/next/app';
import { BiWorld } from 'react-icons/bi';
import { MdOutlineTableChart } from 'react-icons/md';
import useSWR from 'swr';

import { createCuadreRecord } from '~/server/actions/cuadreActions';
import { type TransactionRecord } from '~/types';

import ExportDateRangeModal from '../ExportDateRangeModal';
import SearchFilters from '../filters/SearchFilters';
import { Icons } from '../icons';

import HeaderTitles from './HeaderTitles';
import TransactionSearchRemote from './TransactionSearchRemote';
import {
  getEmitidoPorClass,
  useTransactionTableInputs,
} from './TransactionTableInputs';
import { SaveResult, useTransactionTableLogic } from './TransactionTableLogic';
import TransactionTableRow, { InputType } from './TransactionTableRow';
import TransactionTotals from './TransactionTotals';

import '~/styles/buttonLoader.css';
import '~/styles/deleteButton.css';
import '~/styles/exportButton.css';
import '~/styles/buttonSpinner.css';

interface TransactionTableProps {
  initialData: TransactionRecord[];
  onUpdateRecordAction: (records: TransactionRecord[]) => Promise<SaveResult>;
  showTotals: boolean;
  onToggleTotalsAction: () => void;
  searchTerm?: string;
  isLoading?: boolean; // <-- agrega esta prop
}

function formatLongDate(date: Date) {
  return date
    .toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Bogota',
    })
    .toUpperCase();
}

function DatePagination({
  selectedDateObj,
  hasPreviousDay,
  hasNextDay,
  totalDays,
  currentDayIndex,
  isLoadingPage,
  onPaginate,
}: {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  selectedDate: string;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  selectedDateObj: Date;
  hasPreviousDay: boolean;
  hasNextDay: boolean;
  totalDays: number;
  currentDayIndex: number;
  isLoadingPage: boolean;
  onPaginate: (direction: 'prev' | 'next') => void;
}) {
  const formattedLong = formatLongDate(selectedDateObj);

  return (
    <div className="mt-4 flex flex-col items-center gap-2 pb-8">
      <span className="font-display text-lg font-bold text-black">
        {formattedLong}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPaginate('prev')}
          disabled={!hasPreviousDay || isLoadingPage}
          className={`flex items-center gap-2 rounded-lg border border-gray-400 bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-2 text-sm font-semibold text-gray-800 shadow transition hover:bg-gray-300 hover:from-gray-200 hover:to-gray-300 active:scale-95 ${
            !hasPreviousDay || isLoadingPage
              ? 'cursor-not-allowed opacity-50'
              : ''
          }`}
        >
          {isLoadingPage ? <Icons.spinner className="h-4 w-4" /> : null}
          <span className="font-bold">&larr;</span> Día anterior
        </button>
        <span className="font-display flex items-center px-4 text-sm text-black">
          Día {currentDayIndex + 1} de {totalDays}
        </span>
        <button
          onClick={() => onPaginate('next')}
          disabled={!hasNextDay || isLoadingPage}
          className={`flex items-center gap-2 rounded-lg border border-gray-400 bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-2 text-sm font-semibold text-gray-800 shadow transition hover:bg-gray-300 hover:from-gray-200 hover:to-gray-300 active:scale-95 ${
            !hasNextDay || isLoadingPage ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          Día siguiente <span className="font-bold">&rarr;</span>
          {isLoadingPage ? <Icons.spinner className="h-4 w-4" /> : null}
        </button>
      </div>
    </div>
  );
}

export default function TransactionTable(props: TransactionTableProps) {
  const logic = useTransactionTableLogic(props);

  // Usa SWR para asesores con pooling cada 2 segundos
  const { data: asesores = [], mutate: mutateAsesores } = useSWR<string[]>(
    '/api/asesores',
    async (url: string): Promise<string[]> => {
      const res = await fetch(url);
      // Tipar la respuesta para evitar acceso inseguro
      const data: unknown = await res.json();
      if (
        typeof data === 'object' &&
        data !== null &&
        'asesores' in data &&
        Array.isArray((data as { asesores: unknown }).asesores)
      ) {
        return (data as { asesores: unknown[] }).asesores.filter(
          (a): a is string => typeof a === 'string'
        );
      }
      return [];
    },
    { refreshInterval: 2000, revalidateOnFocus: true }
  );

  // Handler para agregar asesor y actualizar la lista local y global
  const handleAddAsesorAction = async (nombre: string) => {
    const res = await fetch('/api/asesores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    });
    if (res.ok) {
      // Revalida el cache global de asesores para todos los equipos
      void mutateAsesores();
    } else {
      alert('Error al agregar asesor.');
    }
  };

  const { renderInput } = useTransactionTableInputs({
    editValues: logic.editValues,
    handleInputChangeAction: logic.handleInputChange,
    formatCurrencyAction: logic.formatCurrency,
    parseNumberAction: logic.parseNumber,
    asesores,
    onAddAsesorAction: handleAddAsesorAction,
  });
  const router = useRouter();

  // Calcula el total de páginas para la paginación del día actual
  const totalPages = Math.max(1, Math.ceil((logic.totalRecords ?? 1) / 50));
  const selectedDateObj = (() => {
    const [y, m, d] = logic.selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  })();

  // --- NUEVO: Determina los días únicos disponibles en los registros ---
  const allDates = React.useMemo(() => {
    const set = new Set(
      props.initialData
        .map((r) => {
          // ARREGLO: Solo procesa fechas válidas y tipa correctamente
          let d: Date;
          if (r.fecha instanceof Date) {
            d = r.fecha;
          } else if (
            typeof r.fecha === 'string' ||
            typeof r.fecha === 'number'
          ) {
            d = new Date(r.fecha);
          } else {
            return null;
          }
          if (isNaN(d.getTime())) return null;
          return d.toISOString().slice(0, 10);
        })
        .filter((d): d is string => !!d)
    );
    return Array.from(set).sort();
  }, [props.initialData]);

  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];

  // Determina si hay días anteriores o siguientes disponibles
  const hasPreviousDay = logic.selectedDate > minDate;
  const hasNextDay = logic.selectedDate < maxDate;

  // --- NUEVO: Calcula el índice del día actual y el total de días únicos ---
  const currentDayIndex = allDates.findIndex((d) => d === logic.selectedDate);
  const totalDays = allDates.length;

  // --- SIEMPRE muestra la fecha arriba del botón agregar en formato largo ---
  // --- SOLO muestra la paginación de días abajo de la tabla (NO la muestres dos veces) ---

  // Saber si está cargando la página de registros
  // ARREGLO: Solo muestra "Cargando registros..." si realmente está esperando datos de un día que sí existe en initialData
  const isLoadingPage =
    logic.isTrulyLoadingPage ||
    (logic.paginatedData.length === 0 &&
      !props.isLoading &&
      !!logic.dateFilter.startDate &&
      props.initialData.some((r) => {
        const d =
          r.fecha instanceof Date
            ? r.fecha.toISOString().slice(0, 10)
            : new Date(r.fecha).toISOString().slice(0, 10);
        return d === logic.selectedDate;
      }));

  // Handler para paginación con loading
  const [isPaginating, setIsPaginating] = React.useState(false);
  const paginatingRef = React.useRef(false);

  // Refactor: solo cambia el estado en el handler, nunca en render
  const handlePaginate = (direction: 'prev' | 'next') => {
    if (paginatingRef.current) return;
    paginatingRef.current = true;
    setIsPaginating(true);
    if (direction === 'prev') {
      logic.goToPreviousDay();
    } else {
      logic.goToNextDay();
    }
  };

  // Cuando cambie selectedDate, termina el loading de paginación
  React.useEffect(() => {
    if (isPaginating) {
      // Da tiempo a que la tabla recargue, luego quita el loading
      const timeout = setTimeout(() => {
        setIsPaginating(false);
        paginatingRef.current = false;
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [logic.selectedDate, isPaginating]);

  // --- NUEVO: Estado de loading para el botón de pagar boletas ---
  const [isPaying, setIsPaying] = React.useState(false);
  const [pendingPaidIds, setPendingPaidIds] = React.useState<string[]>([]);

  // --- NUEVO: Limpia la selección de boletas pagadas automáticamente ---
  React.useEffect(() => {
    // Si algún registro seleccionado ya está pagado, quítalo de la selección
    const pagados = Array.from(logic.selectedRows).filter((id) => {
      const row = logic.paginatedData.find((r) => r.id === id);
      return row && row.pagado === true;
    });
    if (pagados.length > 0) {
      const newSelected = new Set(logic.selectedRows);
      pagados.forEach((id) => newSelected.delete(id));
      if (newSelected.size !== logic.selectedRows.size) {
        logic.setSelectedRows(newSelected);
      }
    }
    // Agrega 'logic' como dependencia para cumplir con react-hooks/exhaustive-deps
  }, [logic.selectedRows, logic.paginatedData, logic.setSelectedRows, logic]);

  // Handler para pagar boletas seleccionadas
  const handlePayWithSpinner = async () => {
    setIsPaying(true);
    setPendingPaidIds(Array.from(logic.selectedRows));
    await logic.handlePay();
    // El efecto de abajo se encargará de limpiar la selección cuando todos estén pagados
  };

  // --- NUEVO: Efecto para limpiar selección cuando todos los pagados estén reflejados en la tabla ---
  React.useEffect(() => {
    if (isPaying && pendingPaidIds.length > 0) {
      // Busca si todos los ids pendientes ya tienen pagado: true en la tabla
      const allPaid = pendingPaidIds.every((id) => {
        const row = logic.paginatedData.find((r) => r.id === id);
        return row && row.pagado === true;
      });
      if (allPaid) {
        logic.setSelectedRows(new Set());
        setPendingPaidIds([]);
        setIsPaying(false);
      }
    }
  }, [logic.paginatedData, isPaying, pendingPaidIds, logic]);

  return (
    <div className="relative">
      {/* Mostrar SIEMPRE la fecha en formato largo arriba del botón agregar */}
      {!props.showTotals && (
        <div className="mb-3 flex items-center justify-between">
          <time
            id="current-date-display"
            className="font-display text-3xl font-bold tracking-tight text-black"
          >
            {formatLongDate(selectedDateObj)}
          </time>
        </div>
      )}
      <div className="mb-4">
        {/* Fecha actual de la página, arriba del grupo de botones */}
        <div className="mb-4 flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Botón Agregar y Eliminar solo si NO estamos en la vista de totales */}
            {!props.showTotals && (
              <>
                {/* Botón Agregar */}
                <button
                  onClick={logic.addNewRow}
                  disabled={logic.isAddingRow}
                  className="group relative flex h-10 w-36 cursor-pointer items-center overflow-hidden rounded-lg border border-green-500 bg-green-500 hover:bg-green-500 active:border-green-500 active:bg-green-500 disabled:opacity-50"
                >
                  <span
                    className={`ml-8 transform font-semibold text-white transition-all duration-300 ${
                      logic.isAddingRow
                        ? 'opacity-0'
                        : 'group-hover:translate-x-20'
                    }`}
                  >
                    Agregar
                  </span>
                  <span
                    className={`absolute right-0 flex h-full items-center justify-center rounded-lg bg-green-500 transition-all duration-300 ${
                      logic.isAddingRow
                        ? 'w-full translate-x-0'
                        : 'w-10 group-hover:w-full group-hover:translate-x-0'
                    }`}
                  >
                    {logic.isAddingRow ? (
                      <div className="button-spinner">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div key={i} className="spinner-blade" />
                        ))}
                      </div>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-8 text-white group-active:scale-[0.8]"
                        fill="none"
                        height="24"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        width="24"
                      >
                        <line x1="12" x2="12" y1="5" y2="19" />
                        <line x1="5" x2="19" y1="12" y2="12" />
                      </svg>
                    )}
                  </span>
                </button>

                {/* Botón Eliminar */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={logic.handleDeleteModeToggle}
                    className="delete-button"
                  >
                    <span className="text">
                      {logic.isDeleteMode ? 'Cancelar' : 'Eliminar'}
                    </span>
                    <span className="icon">
                      {logic.isDeleteMode ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                        >
                          <path d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                        >
                          <path d="M3 6v18h18v-18h-18zm5 14c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm4-18v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.315c0 .901.73 2 1.631 2h5.712z" />
                        </svg>
                      )}
                    </span>
                  </button>
                  {logic.isDeleteMode && logic.rowsToDelete.size > 0 ? (
                    <button
                      onClick={logic.handleDeleteSelected}
                      className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                    >
                      Eliminar ({logic.rowsToDelete.size})
                    </button>
                  ) : null}
                </div>
              </>
            )}
            {props.showTotals ? (
              <div className="flex gap-4 pl-6">
                {/* Botón Ver Totales / Ver Registros */}
                <button
                  onClick={logic.handleToggleTotals}
                  disabled={logic.isTotalsButtonLoading}
                  className="relative flex h-10 min-w-[150px] items-center justify-center gap-2 rounded-[8px] bg-blue-500 px-6 py-2 font-bold text-white transition-transform duration-300 hover:bg-blue-600"
                >
                  <span className="flex w-full items-center justify-center">
                    {logic.isTotalsButtonLoading ? (
                      <>
                        {/* Spinner2 centrado absoluto sobre el botón */}
                        <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                          <Icons.spinner2 className="h-5 w-5 fill-white" />
                        </span>
                        {/* Espacio reservado para el texto, invisible pero ocupa el mismo ancho */}
                        <span className="invisible flex items-center">
                          {props.showTotals ? (
                            <>
                              <MdOutlineTableChart className="mr-1 h-5 w-5" />
                              Ver Registros
                            </>
                          ) : (
                            <>
                              <BiWorld className="mr-1 h-5 w-5" />
                              Ver Totales
                            </>
                          )}
                        </span>
                      </>
                    ) : props.showTotals ? (
                      <>
                        <MdOutlineTableChart className="mr-1 h-5 w-5" />
                        Ver Registros
                      </>
                    ) : (
                      <>
                        <BiWorld className="mr-1 h-5 w-5" />
                        Ver Totales
                      </>
                    )}
                  </span>
                </button>
                {/* Botón Exportar a Excel */}
                <button
                  onClick={() => logic.setIsExportModalOpen(true)}
                  className="export-excel-button h-10 px-12"
                >
                  <svg
                    fill="#fff"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 50 50"
                  >
                    <path d="M28.8125 .03125L.8125 5.34375C.339844 5.433594 0 5.863281 0 6.34375L0 43.65625C0 44.136719 .339844 44.566406 .8125 44.65625L28.8125 49.96875C28.875 49.980469 28.9375 50 29 50C29.230469 50 29.445313 49.929688 29.625 49.78125C29.855469 49.589844 30 49.296875 30 49L30 1C30 .703125 29.855469 .410156 29.625 .21875C29.394531 .0273438 29.105469 -.0234375 28.8125 .03125ZM32 6L32 13L34 13L34 15L32 15L32 20L34 20L34 22L32 22L32 27L34 27L34 29L32 29L32 35L34 35L34 37L32 37L32 44L47 44C48.101563 44 49 43.101563 49 42L49 8C49 6.898438 48.101563 6 47 6ZM6.6875 15.6875L11.8125 15.6875L14.5 21.28125C14.710938 21.722656 14.898438 22.265625 15.0625 22.875L15.09375 22.875C15.199219 22.511719 15.402344 21.941406 15.6875 21.21875L18.65625 15.6875L23.34375 15.6875L17.75 24.9375L23.5 34.375L18.53125 34.375L15.28125 28.28125C15.160156 28.054688 15.035156 27.636719 14.90625 27.03125L14.875 27.03125C14.8125 27.316406 14.664063 27.761719 14.4375 28.34375L11.1875 34.375L6.1875 34.375L12.15625 25.03125ZM36 20L44 20L44 22L36 22ZM36 27L44 27L44 29L36 29ZM36 35L44 35L44 37L36 37Z" />
                  </svg>
                  Exportar a Excel
                </button>
                {/* Botón Ir al Cuadre */}
                <button
                  onClick={logic.handleNavigateToCuadre}
                  disabled={logic.isNavigatingToCuadre}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2 font-bold text-white hover:bg-orange-600 active:scale-95 disabled:opacity-50"
                >
                  {logic.isNavigatingToCuadre ? (
                    <>
                      <Icons.spinner className="h-5 w-5" />
                      <span>Redirigiendo...</span>
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
                          d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 100 2h4a1 1 0 100-2H8z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Ir al Cuadre</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                {/* Botón Ver Totales / Ver Registros */}
                <button
                  onClick={logic.handleToggleTotals}
                  disabled={logic.isTotalsButtonLoading}
                  className="relative flex h-10 min-w-[150px] items-center justify-center gap-2 rounded-[8px] bg-blue-500 px-4 py-2 font-bold text-white transition-transform duration-300 hover:bg-blue-600"
                >
                  <span className="flex w-full items-center justify-center">
                    {logic.isTotalsButtonLoading ? (
                      <>
                        {/* Spinner2 centrado absoluto sobre el botón */}
                        <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                          <Icons.spinner2 className="h-5 w-5 fill-white" />
                        </span>
                        {/* Espacio reservado para el texto, invisible pero ocupa el mismo ancho */}
                        <span className="invisible flex items-center">
                          {props.showTotals ? (
                            <>
                              <MdOutlineTableChart className="mr-1 h-5 w-5" />
                              Ver Registros
                            </>
                          ) : (
                            <>
                              <BiWorld className="mr-1 h-5 w-5" />
                              Ver Totales
                            </>
                          )}
                        </span>
                      </>
                    ) : props.showTotals ? (
                      <>
                        <MdOutlineTableChart className="mr-1 h-5 w-5" />
                        Ver Registros
                      </>
                    ) : (
                      <>
                        <BiWorld className="mr-1 h-5 w-5" />
                        Ver Totales
                      </>
                    )}
                  </span>
                </button>
                {/* Botón Exportar a Excel */}
                <button
                  onClick={() => logic.setIsExportModalOpen(true)}
                  className="export-excel-button h-10 px-8"
                >
                  <svg
                    fill="#fff"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 50 50"
                  >
                    <path d="M28.8125 .03125L.8125 5.34375C.339844 5.433594 0 5.863281 0 6.34375L0 43.65625C0 44.136719 .339844 44.566406 .8125 44.65625L28.8125 49.96875C28.875 49.980469 28.9375 50 29 50C29.230469 50 29.445313 49.929688 29.625 49.78125C29.855469 49.589844 30 49.296875 30 49L30 1C30 .703125 29.855469 .410156 29.625 .21875C29.394531 .0273438 29.105469 -.0234375 28.8125 .03125ZM32 6L32 13L34 13L34 15L32 15L32 20L34 20L34 22L32 22L32 27L34 27L34 29L32 29L32 35L34 35L34 37L32 37L32 44L47 44C48.101563 44 49 43.101563 49 42L49 8C49 6.898438 48.101563 6 47 6ZM6.6875 15.6875L11.8125 15.6875L14.5 21.28125C14.710938 21.722656 14.898438 22.265625 15.0625 22.875L15.09375 22.875C15.199219 22.511719 15.402344 21.941406 15.6875 21.21875L18.65625 15.6875L23.34375 15.6875L17.75 24.9375L23.5 34.375L18.53125 34.375L15.28125 28.28125C15.160156 28.054688 15.035156 27.636719 14.90625 27.03125L14.875 27.03125C14.8125 27.316406 14.664063 27.761719 14.4375 28.34375L11.1875 34.375L6.1875 34.375L12.15625 25.03125ZM36 20L44 20L44 22L36 22ZM36 27L44 27L44 29L36 29ZM36 35L44 35L44 37L36 37Z" />
                  </svg>
                  Exportar a Excel
                </button>
                {/* Botón Ir al Cuadre */}
                <button
                  onClick={logic.handleNavigateToCuadre}
                  disabled={logic.isNavigatingToCuadre}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-bold text-white hover:bg-orange-600 active:scale-95 disabled:opacity-50"
                >
                  {logic.isNavigatingToCuadre ? (
                    <>
                      <Icons.spinner className="h-5 w-5" />
                      <span>Redirigiendo...</span>
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
                          d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 100 2h4a1 1 0 100-2H8z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Ir al Cuadre</span>
                    </>
                  )}
                </button>
              </>
            )}
            {/* Controles de auto-guardado y zoom solo en la vista de registros */}
            {!props.showTotals && (
              <div className="flex items-center gap-4">
                {/* Indicador de auto-guardado */}
                <div className="flex h-10 items-center gap-4">
                  {logic.isActuallySaving ? (
                    <span className="flex h-10 items-center gap-2 rounded-md bg-blue-300 px-4 py-2 text-sm font-bold text-blue-800">
                      <Icons.spinner3 className="h-4 w-4" />
                      Guardando cambios...
                    </span>
                  ) : (
                    <span className="flex h-10 items-center rounded-md bg-green-300 px-4 py-2 text-sm font-bold text-green-800">
                      ✓ Todos los cambios guardados
                    </span>
                  )}
                </div>
                {/* Controles de zoom */}
                <div className="flex h-10 items-center gap-1">
                  <button
                    onClick={logic.handleZoomOut}
                    className="flex h-8 w-8 items-center justify-center rounded bg-gray-600 text-white hover:bg-gray-600"
                    title="Reducir zoom"
                  >
                    -
                  </button>
                  <span className="w-16 text-center text-sm font-medium text-black">
                    {Math.round(logic.zoom * 100)}%
                  </span>
                  <button
                    onClick={logic.handleZoomIn}
                    className="flex h-8 w-8 items-center justify-center rounded bg-gray-500 text-white hover:bg-gray-600"
                    title="Aumentar zoom"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mover SearchFilters aquí, justo debajo de los botones principales y arriba de la tabla */}
        {!props.showTotals && (
          <SearchFilters
            data={props.initialData}
            onFilterAction={logic.handleFilterData}
            onDateFilterChangeAction={logic.handleDateFilterChange}
            onToggleAsesorSelectionAction={logic.handleToggleAsesorMode}
            onGenerateCuadreAction={async (records) => {
              const selectedRecords = records.filter((r) =>
                logic.selectedAsesores.has(r.id)
              );
              if (selectedRecords.length > 0) {
                await Promise.all(
                  selectedRecords.map((record) =>
                    createCuadreRecord(record.id, {
                      banco: '',
                      monto: 0,
                      pagado: false,
                      fechaCliente: null,
                      referencia: '',
                    })
                  )
                );
                localStorage.setItem(
                  'cuadreRecords',
                  JSON.stringify(selectedRecords)
                );
                router.push('/cuadre', { startPosition: 0.3 });
              }
            }}
            hasSearchResults={logic.hasSearchResults}
            isAsesorSelectionMode={logic.isAsesorSelectionMode}
            hasSelectedAsesores={logic.selectedAsesores.size > 0}
            isLoadingAsesorMode={logic.isLoadingAsesorMode}
            searchTerm={props.searchTerm ?? ''}
            setSearchTermAction={logic.setSearchTermAction}
          />
        )}

        {/* Modal de exportación por rango de fechas */}
        <ExportDateRangeModal
          isOpen={logic.isExportModalOpen}
          setIsOpen={logic.setIsExportModalOpen} // <-- corregido aquí
          onExport={logic.handleExport}
        />

        {/* Mostrar tabla de búsqueda remota si hay término de búsqueda */}
        {!props.showTotals && props.searchTerm ? (
          <div
            className="table-container"
            style={{
              backgroundImage: 'url("/background-table.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <TransactionSearchRemote
              onRowSelect={logic.handleRowSelect}
              renderCheckbox={logic.renderCheckbox}
              renderAsesorSelect={logic.renderAsesorSelect}
              renderInput={renderInput}
              getEmitidoPorClass={getEmitidoPorClass}
              isDeleteMode={logic.isDeleteMode}
              isAsesorSelectionMode={logic.isAsesorSelectionMode}
              selectedRows={logic.selectedRows}
              rowsToDelete={logic.rowsToDelete}
              handleDeleteSelect={logic.handleDeleteSelect}
              searchTerm={props.searchTerm ?? ''}
              searchTrigger={logic.searchTrigger}
            />
          </div>
        ) : null}
        {!props.showTotals && !props.searchTerm ? (
          <div
            className="table-container"
            style={{
              backgroundImage: 'url("/background-table.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            {isLoadingPage || isPaginating ? (
              <div className="flex items-center justify-center gap-2 py-8 text-lg font-bold text-blue-700">
                <Icons.spinner className="h-6 w-6" />
                Cargando registros...
              </div>
            ) : logic.paginatedData.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-lg font-semibold text-gray-500">
                Este día no tiene registros
              </div>
            ) : (
              <div
                className="table-scroll-container"
                style={{
                  transform: `scale(${logic.zoom})`,
                  transformOrigin: 'left top',
                  width: `${(1 / logic.zoom) * 100}%`,
                  height: `${(1 / logic.zoom) * 100}%`,
                  overflowX: logic.zoom === 1 ? 'auto' : 'scroll',
                  overflowY: 'auto',
                }}
              >
                <table className="w-full text-left text-sm text-gray-600">
                  <HeaderTitles isDeleteMode={logic.isDeleteMode} />
                  <tbody>
                    {logic.paginatedData.map(
                      (row: TransactionRecord, index: number) => {
                        return (
                          <TransactionTableRow
                            key={row.id}
                            row={row}
                            isDeleteMode={logic.isDeleteMode}
                            isAsesorSelectionMode={logic.isAsesorSelectionMode}
                            selectedRows={logic.selectedRows}
                            rowsToDelete={logic.rowsToDelete}
                            handleInputChange={logic.handleInputChange}
                            handleRowSelect={logic.handleRowSelect}
                            handleDeleteSelect={logic.handleDeleteSelect}
                            renderCheckbox={logic.renderCheckbox}
                            renderAsesorSelect={logic.renderAsesorSelect}
                            renderInput={
                              renderInput as (
                                row: TransactionRecord,
                                field: keyof TransactionRecord,
                                type?: InputType
                              ) => React.ReactNode
                            }
                            getEmitidoPorClass={getEmitidoPorClass}
                            _index={index}
                          />
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* Solo mostrar SearchControls si NO estamos en la vista de totales */}
        {props.showTotals ? (
          <TransactionTotals transactions={props.initialData} />
        ) : null}

        {/* Add the payment UI */}
        {logic.selectedRows.size > 0 && (
          <div className="fixed right-4 bottom-4 flex w-[400px] flex-col gap-4 rounded-lg bg-white p-6 shadow-lg">
            <div className="text-center">
              <div className="mb-2 font-semibold">
                Total Seleccionado: $
                {logic.formatCurrency(
                  Array.from(logic.selectedRows)
                    .map((id) => {
                      const row = logic.paginatedData.find((r) => r.id === id);
                      return row && !row.pagado ? row.precioNeto : 0;
                    })
                    .reduce((a, b) => a + b, 0)
                )}
              </div>
              <div className="flex flex-col gap-2 text-base">
                <div>
                  Boletas:{' '}
                  {
                    Array.from(logic.selectedRows).filter((id) => {
                      const row = logic.paginatedData.find((r) => r.id === id);
                      return row && !row.pagado;
                    }).length
                  }
                </div>
                <div className="font-mono uppercase">
                  Placas:{' '}
                  {Array.from(logic.selectedRows)
                    .filter((id) => {
                      const row = logic.paginatedData.find((r) => r.id === id);
                      return row && !row.pagado;
                    })
                    .map((id) => {
                      const row = logic.paginatedData.find((r) => r.id === id);
                      return row?.placa?.toUpperCase();
                    })
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            </div>
            <button
              onClick={handlePayWithSpinner}
              className="mt-2 flex w-full items-center justify-center rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
              disabled={isPaying}
            >
              {isPaying ? (
                <>
                  <Icons.spinner className="mr-2 h-5 w-5 animate-spin" />
                  Procesando pago...
                </>
              ) : (
                'Pagar Boletas Seleccionadas'
              )}
            </button>
          </div>
        )}
      </div>
      {/* Muestra SOLO UNA VEZ la paginación de días abajo de la tabla */}
      {!props.showTotals && (
        <DatePagination
          currentPage={logic.currentPage}
          setCurrentPage={logic.setCurrentPage}
          totalPages={totalPages}
          selectedDate={logic.selectedDate}
          goToPreviousDay={logic.goToPreviousDay}
          goToNextDay={logic.goToNextDay}
          selectedDateObj={selectedDateObj}
          hasPreviousDay={hasPreviousDay}
          hasNextDay={hasNextDay}
          totalDays={totalDays}
          currentDayIndex={currentDayIndex}
          isLoadingPage={isLoadingPage || isPaginating}
          onPaginate={handlePaginate}
        />
      )}
    </div>
  );
}
