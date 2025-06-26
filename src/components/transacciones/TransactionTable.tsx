'use client';

import React from 'react';

import { useRouter } from '@bprogress/next/app';
import { BiWorld } from 'react-icons/bi';
import { MdOutlineTableChart } from 'react-icons/md';

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

interface DatePaginationProps {
  groupedByDate: { date: string; records: TransactionRecord[] }[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  dateFilter: { startDate: Date | null; endDate: Date | null };
}

function DatePagination({
  groupedByDate,
  currentPage,
  setCurrentPage,
  dateFilter,
}: DatePaginationProps) {
  if (dateFilter.startDate || dateFilter.endDate) return null;
  const totalPages = groupedByDate.length;
  return (
    <div className="mt-4 flex justify-center gap-2">
      <button
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="rounded px-4 py-2 text-sm font-medium text-black hover:bg-white/10 disabled:opacity-50"
      >
        Anterior
      </button>
      <span className="font-display flex items-center px-4 text-sm text-black">
        Página {currentPage} de {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="rounded px-4 py-2 text-sm font-medium text-black hover:bg-white/10 disabled:opacity-50"
      >
        Siguiente
      </button>
    </div>
  );
}

export default function TransactionTable(props: TransactionTableProps) {
  const logic = useTransactionTableLogic(props);
  const { renderInput } = useTransactionTableInputs({
    editValues: logic.editValues,
    handleInputChangeAction: logic.handleInputChange,
    formatCurrencyAction: logic.formatCurrency,
    parseNumberAction: logic.parseNumber,
  });
  const router = useRouter();

  return (
    <div className="relative">
      {/* Mostrar spinner si está cargando */}
      {props.isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <span className="text-lg font-bold text-blue-600">Cargando...</span>
        </div>
      ) : (
        <>
          {/* Mostrar fecha solo si NO estamos en la vista de totales */}
          {!props.showTotals && (
            <div className="mb-3 flex items-center justify-between">
              <time
                id="current-date-display"
                className="font-display text-3xl font-bold tracking-tight text-black"
              >
                {logic._currentDateDisplay}
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
              setIsOpen={logic.setIsExportModalOpen}
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
                              isAsesorSelectionMode={
                                logic.isAsesorSelectionMode
                              }
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
              </div>
            ) : null}
            {/* Solo mostrar SearchControls si NO estamos en la vista de totales */}
            {/* (Eliminado el segundo SearchFilters aquí) */}

            {props.showTotals ? (
              <TransactionTotals transactions={props.initialData} />
            ) : null}

            {!props.showTotals &&
              !props.searchTerm &&
              !logic.dateFilter.startDate &&
              !logic.dateFilter.endDate && (
                <DatePagination
                  groupedByDate={logic.groupedByDate}
                  currentPage={logic.currentPage}
                  setCurrentPage={logic.setCurrentPage}
                  dateFilter={logic.dateFilter}
                />
              )}

            {/* Add the payment UI */}
            {logic.selectedRows.size > 0 && (
              <div className="fixed right-4 bottom-4 flex w-[400px] flex-col gap-4 rounded-lg bg-white p-6 shadow-lg">
                <div className="text-center">
                  <div className="mb-2 font-semibold">
                    Total Seleccionado: $
                    {logic.formatCurrency(logic.totalSelected)}
                  </div>
                  <div className="flex flex-col gap-2 text-base">
                    <div>Boletas: {logic.selectedRows.size}</div>
                    <div className="font-mono uppercase">
                      Placas: {logic._selectedPlates.join(', ')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={logic.handlePay}
                  className="mt-2 w-full rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                >
                  Pagar Boletas Seleccionadas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
