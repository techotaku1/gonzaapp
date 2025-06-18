'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Header from '~/components/Header';
import { useDebouncedSave } from '~/hooks/useDebouncedSave';
import { updateRecords } from '~/server/actions/tableGeneral';
import { bancoOptions } from '~/utils/constants';

import type { TransactionRecord } from '~/types';

import '~/styles/deleteButton.css';

interface SummaryRecord extends TransactionRecord {
  totalCombinado: number;
  groupId?: string; // Add groupId to identify cuadre groups
  createdAt?: Date; // Add timestamp for when the cuadre was created
}

export default function CuadrePage() {
  const router = useRouter();
  const [summaryData, setSummaryData] = useState<SummaryRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<Set<string>>(new Set());

  useEffect(() => {
    const savedRecords = localStorage.getItem('cuadreRecords');
    const existingCuadres = localStorage.getItem('existingCuadres');

    let allRecords: SummaryRecord[] = [];

    // Load existing cuadres if any
    if (existingCuadres) {
      try {
        const parsedRecords = JSON.parse(existingCuadres) as SummaryRecord[];
        // Ensure dates are properly parsed
        allRecords = parsedRecords.map((record) => ({
          ...record,
          fecha: new Date(record.fecha),
          fechaCliente: record.fechaCliente
            ? new Date(record.fechaCliente)
            : null,
          createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
        }));
      } catch (error) {
        console.error('Error loading existing cuadres:', error);
      }
    }

    // Add new records if any
    if (savedRecords) {
      try {
        const newRecords = JSON.parse(savedRecords) as TransactionRecord[];
        const groupId = crypto.randomUUID();
        const newGroupRecords = newRecords.map((record) => ({
          ...record,
          fecha: new Date(record.fecha),
          fechaCliente: record.fechaCliente
            ? new Date(record.fechaCliente)
            : null,
          totalCombinado: record.precioNeto + record.tarifaServicio,
          groupId,
          createdAt: new Date(),
        }));

        allRecords = [...allRecords, ...newGroupRecords];

        // Save all records back to localStorage
        localStorage.setItem('existingCuadres', JSON.stringify(allRecords));
        localStorage.removeItem('cuadreRecords'); // Clear the temporary storage
      } catch (error) {
        console.error('Error processing new records:', error);
      }
    }

    // Update state with all records
    setSummaryData(allRecords);
  }, []);

  const handleSaveOperation = useCallback(
    async (records: TransactionRecord[]) => {
      try {
        setIsSaving(true);
        const result = await updateRecords(records);
        if (result.success) {
          // Update localStorage with all current records
          localStorage.setItem('existingCuadres', JSON.stringify(records));
        }
        return result;
      } catch (error) {
        console.error('Error saving changes:', error);
        return { success: false, error: 'Failed to save changes' };
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const handleSaveSuccess = useCallback(() => {
    setIsSaving(false);
  }, []);

  const debouncedSave = useDebouncedSave(
    handleSaveOperation,
    handleSaveSuccess,
    2000
  );

  const handleUpdateBancoReferencia = (
    id: string,
    field: 'banco' | 'referencia' | 'banco2' | 'fechaCliente',
    value: string | Date | null
  ) => {
    setSummaryData((prev) => {
      const newData = prev.map((record) =>
        record.id === id ? { ...record, [field]: value } : record
      );
      // Trigger auto-save
      void debouncedSave(newData);
      return newData;
    });
  };

  // Group records by groupId for display
  const groupedRecords = useMemo(() => {
    const groups = new Map<string, SummaryRecord[]>();

    summaryData.forEach((record) => {
      const groupId = record.groupId ?? 'ungrouped';
      const existingGroup = groups.get(groupId) ?? [];
      groups.set(groupId, [...existingGroup, record]);
    });

    // Sort groups by creation date (newest first)
    return Array.from(groups.entries()).sort(([, a], [, b]) => {
      const dateA = a[0]?.createdAt ?? new Date(0);
      const dateB = b[0]?.createdAt ?? new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [summaryData]);

  // Add delete handlers
  const handleDeleteModeToggle = () => {
    setIsDeleteMode(!isDeleteMode);
    setRowsToDelete(new Set());
  };

  const handleDeleteSelect = (id: string) => {
    const newSelected = new Set(rowsToDelete);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setRowsToDelete(newSelected);
  };

  const handleDeleteSelected = () => {
    if (rowsToDelete.size === 0) return;

    if (confirm(`¿Está seguro de eliminar ${rowsToDelete.size} registros?`)) {
      setSummaryData((prev) =>
        prev.filter((record) => !rowsToDelete.has(record.id))
      );
      // Update localStorage after deletion
      const updatedRecords = summaryData.filter(
        (record) => !rowsToDelete.has(record.id)
      );
      localStorage.setItem('existingCuadres', JSON.stringify(updatedRecords));
      setRowsToDelete(new Set());
      setIsDeleteMode(false);
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 z-50 w-full">
        <Header />
      </div>
      <div className="container mx-auto min-h-screen p-4 pt-20">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-gray-600 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Volver al Inicio
              </Link>
            </div>
            <div className="flex flex-col items-end gap-2">
              <h1 className="text-2xl font-bold">Cuadre de Registros</h1>
              <div className="flex items-center gap-4">
                {/* Delete button and auto-save status */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteModeToggle}
                    className="delete-button"
                  >
                    <span className="text">
                      {isDeleteMode ? 'Cancelar' : 'Eliminar'}
                    </span>
                    <span className="icon">
                      {isDeleteMode ? (
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
                  {isDeleteMode && rowsToDelete.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                    >
                      Eliminar ({rowsToDelete.size})
                    </button>
                  )}
                </div>
                {isSaving ? (
                  <span className="flex items-center gap-2 rounded-md bg-blue-300 px-3 py-2.5 text-sm font-bold text-blue-800">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Guardando cambios...
                  </span>
                ) : (
                  <span className="rounded-md bg-green-300 px-3 py-2.5 text-sm font-bold text-green-800">
                    ✓ Todos los cambios guardados
                  </span>
                )}
              </div>
            </div>
          </div>
          {groupedRecords.map(([groupId, records]) => (
            <div key={groupId} className="mb-8">
              <h3 className="mb-4 text-lg font-semibold">
                Cuadre{' '}
                {records[0]?.createdAt
                  ? new Date(records[0].createdAt).toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Sin fecha'}{' '}
                ({records.length} registros)
              </h3>
              <div className="overflow-x-auto rounded-lg bg-white shadow-lg">
                <table className="cuadre-table">
                  <thead>
                    <tr>
                      {isDeleteMode && (
                        <th className="cuadre-header font-lexend relative w-10 border-r bg-white">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                              className="h-4 w-4 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </div>
                        </th>
                      )}
                      {[
                        'Fecha',
                        'Placa',
                        'Emitido Por',
                        'Asesor',
                        'Total (Precio + Tarifa)',
                        'Banco',
                        'Banco 2',
                        'Fecha Cliente',
                        'Referencia',
                      ].map((header) => (
                        <th
                          key={header}
                          className="cuadre-header font-lexend relative border-r bg-white"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {records.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-gray-50">
                        {isDeleteMode && (
                          <td className="cuadre-cell">
                            <div className="flex h-full items-center justify-center">
                              <input
                                type="checkbox"
                                checked={rowsToDelete.has(record.id)}
                                onChange={() => handleDeleteSelect(record.id)}
                                className="h-4 w-4 rounded border-gray-600"
                              />
                            </div>
                          </td>
                        )}
                        <td className="cuadre-cell font-lexend">
                          {record.fecha.toLocaleDateString()}
                        </td>
                        <td className="cuadre-cell font-lexend uppercase">
                          {record.placa}
                        </td>
                        <td className="cuadre-cell font-lexend">
                          {record.emitidoPor}
                        </td>
                        <td className="cuadre-cell font-lexend">
                          {record.asesor}
                        </td>
                        <td className="cuadre-cell font-lexend">
                          ${record.totalCombinado.toLocaleString()}
                        </td>
                        <td className="cuadre-cell">
                          <select
                            value={record.banco ?? ''}
                            onChange={(e) =>
                              handleUpdateBancoReferencia(
                                record.id,
                                'banco',
                                e.target.value
                              )
                            }
                            className="cuadre-select font-lexend"
                          >
                            <option value="">Seleccionar...</option>
                            {bancoOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="cuadre-cell">
                          <select
                            value={record.banco2 ?? ''}
                            onChange={(e) =>
                              handleUpdateBancoReferencia(
                                record.id,
                                'banco2',
                                e.target.value
                              )
                            }
                            className="cuadre-select font-lexend"
                          >
                            <option value="">Seleccionar...</option>
                            {bancoOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="cuadre-cell date-column font-lexend">
                          <input
                            type="datetime-local"
                            value={
                              record.fechaCliente
                                ? new Date(record.fechaCliente)
                                    .toISOString()
                                    .slice(0, 16)
                                : ''
                            }
                            onChange={(e) => {
                              const date = e.target.value
                                ? new Date(e.target.value)
                                : null;
                              handleUpdateBancoReferencia(
                                record.id,
                                'fechaCliente',
                                date
                              );
                            }}
                            className="cuadre-input" // Added text-xs class
                          />
                        </td>
                        <td className="cuadre-cell border-r-0">
                          <input
                            type="text"
                            value={record.referencia ?? ''}
                            onChange={(e) =>
                              handleUpdateBancoReferencia(
                                record.id,
                                'referencia',
                                e.target.value
                              )
                            }
                            className="cuadre-input font-lexend"
                            placeholder="Referencia..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
