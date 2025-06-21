'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { useDebouncedCallback } from 'use-debounce';

import Header from '~/components/Header';
import {
  createCuadreRecord,
  deleteCuadreRecords, // volver a importar
  getCuadreRecords,
  updateCuadreRecord,
} from '~/server/actions/cuadreActions';
import { createRecord } from '~/server/actions/tableGeneral';
import { bancoOptions } from '~/utils/constants';
import {
  fromDatetimeLocalStringToColombiaDate,
  toColombiaDatetimeLocalString,
} from '~/utils/dateUtils';

import type {
  BaseTransactionRecord,
  CuadreData,
  ExtendedSummaryRecord,
} from '~/types';

import '~/styles/deleteButton.css';

export default function CuadrePage() {
  const [summaryData, setSummaryData] = useState<ExtendedSummaryRecord[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<
    Record<string, Partial<CuadreData>>
  >({});
  // Ref para el checkbox de seleccionar todos
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Eliminar useDebouncedSave y usar useDebouncedCallback para guardar cambios debounced
  const debouncedSave = useDebouncedCallback(
    async (pendingEdits: Record<string, Partial<CuadreData>>) => {
      const updates = Object.entries(pendingEdits).map(
        async ([id, changes]) => {
          for (const [field, value] of Object.entries(changes)) {
            await handleUpdateBancoReferencia(
              id,
              field as keyof CuadreData,
              value as string | number | boolean | Date | null
            );
          }
        }
      );
      await Promise.all(updates);
    },
    800
  );

  // Cargar registros de la base de datos al montar el componente
  useEffect(() => {
    const loadCuadreRecords = async () => {
      try {
        const records = await getCuadreRecords();
        setSummaryData(records);
      } catch (error) {
        console.error('Error loading cuadre records:', error);
      }
    };

    void loadCuadreRecords();
  }, []);

  // Procesar nuevos registros del localStorage y guardarlos en BD
  useEffect(() => {
    const savedRecords = localStorage.getItem('cuadreRecords');
    if (!savedRecords) return;

    const createRecords = async () => {
      try {
        const newRecords = JSON.parse(savedRecords) as BaseTransactionRecord[];
        const _groupId = crypto.randomUUID(); // Prefix with _ to mark as intentionally unused

        // Crear registros en BD
        for (const record of newRecords) {
          await createRecord(record);
          await createCuadreRecord(record.id, {
            banco: '',
            monto: 0,
            pagado: false,
            fechaCliente: null,
            referencia: '',
          });
        }

        // Recargar registros actualizados
        const updatedRecords = await getCuadreRecords();
        setSummaryData(updatedRecords);
        localStorage.removeItem('cuadreRecords');
      } catch (error) {
        console.error('Error processing new records:', error);
      }
    };

    void createRecords();
  }, []);

  // Adaptar el handler para los nuevos campos y tipos
  const handleUpdateBancoReferencia = async (
    id: string,
    field: keyof CuadreData,
    value: string | number | boolean | Date | null
  ) => {
    try {
      const record = summaryData.find((r) => r.id === id);
      if (!record) return;

      // Construir el objeto cuadreData solo con el campo a actualizar
      const cuadreData: Partial<CuadreData> = {};
      if (field === 'banco') cuadreData.banco = value as string;
      if (field === 'monto') cuadreData.monto = value as number;
      if (field === 'pagado') cuadreData.pagado = value as boolean;
      if (field === 'fechaCliente')
        cuadreData.fechaCliente = value as Date | null;
      if (field === 'referencia') cuadreData.referencia = value as string;

      await updateCuadreRecord(id, cuadreData as CuadreData);

      // Actualizar estado local después de guardar en BD
      setSummaryData((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
    } catch (error) {
      console.error('Error updating record:', error);
    }
  };

  // Nueva función para manejar cambios locales
  const handleLocalEdit = (
    id: string,
    field: keyof CuadreData,
    value: string | number | boolean | Date | null
  ) => {
    setEditValues((prev) => {
      const updated = {
        ...prev,
        [id]: {
          ...prev[id],
          [field]: value,
        },
      };
      debouncedSave(updated);
      return updated;
    });
    setSummaryData((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Agrupar registros por groupId para mostrar
  const groupedRecords = useMemo(() => {
    const groups = new Map<string, ExtendedSummaryRecord[]>();
    const seenIds = new Set<string>();
    const uniqueSummaryData = summaryData.filter((rec) => {
      if (seenIds.has(rec.id)) return false;
      seenIds.add(rec.id);
      return true;
    });
    uniqueSummaryData.sort((a, b) => {
      const dateA =
        a.fecha instanceof Date
          ? a.fecha.getTime()
          : new Date(a.fecha).getTime();
      const dateB =
        b.fecha instanceof Date
          ? b.fecha.getTime()
          : new Date(b.fecha).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return (a.asesor ?? '').localeCompare(b.asesor ?? '');
    });
    uniqueSummaryData.forEach((record) => {
      const groupId = record.groupId ?? 'ungrouped';
      const existingGroup = groups.get(groupId) ?? [];
      groups.set(groupId, [...existingGroup, record]);
    });
    return Array.from(groups.entries()).sort(([, a], [, b]) => {
      const dateA = a[0]?.createdAt ?? new Date(0);
      const dateB = b[0]?.createdAt ?? new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [summaryData]);

  // Helper para clases de emitidoPor
  function getEmitidoPorClass(emitidoPor: string): string | undefined {
    switch (emitidoPor?.toUpperCase()) {
      case 'GONZAAPP':
        return 'text-blue-700 font-bold';
      case 'ASESOR':
        return 'text-green-700 font-semibold';
      case 'CLIENTE':
        return 'text-purple-700 font-semibold';
      default:
        return 'text-gray-700';
    }
  }

  // Seleccionar/deseleccionar todos los registros de todos los grupos
  const handleSelectAll = (allIds: string[]) => {
    if (rowsToDelete.size === allIds.length) {
      setRowsToDelete(new Set());
    } else {
      setRowsToDelete(new Set(allIds));
    }
  };

  // Efecto para el estado indeterminado del checkbox de seleccionar todos
  useEffect(() => {
    if (selectAllRef.current && groupedRecords.length > 0) {
      const allIds = groupedRecords.flatMap(([, records]) =>
        records.map((r) => r.id)
      );
      selectAllRef.current.indeterminate =
        rowsToDelete.size > 0 && rowsToDelete.size < allIds.length;
    }
  }, [rowsToDelete, groupedRecords]);

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

  return (
    <>
      <div className="fixed top-0 left-0 z-50 w-full">
        <Header />
      </div>
      <div className="container mx-auto min-h-screen p-4 pt-20">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
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
            <h1 className="text-2xl font-bold">Gestión de Cuadres</h1>
            <button
              onClick={handleDeleteModeToggle}
              className="rounded bg-red-500 px-4 py-2 font-semibold text-white transition-all hover:bg-red-600"
            >
              {isDeleteMode ? 'Cancelar' : 'Eliminar Registros'}
            </button>
          </div>
          {/* Auto-save status */}
          <div className="mb-4 flex items-center gap-4">
            {debouncedSave.isPending() ? (
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
            {/* Botón de confirmación de eliminación */}
            {isDeleteMode && rowsToDelete.size > 0 && (
              <button
                onClick={async () => {
                  if (rowsToDelete.size === 0) return;
                  if (
                    confirm(
                      `¿Está seguro de eliminar ${rowsToDelete.size} registros?`
                    )
                  ) {
                    // Usar el id de la tabla cuadre (cuadreId) para eliminar
                    const ids = Array.from(rowsToDelete)
                      .map((transactionId) => {
                        const record = summaryData.find(
                          (r) => r.id === transactionId
                        );
                        return record?.cuadreId;
                      })
                      .filter((id): id is string => Boolean(id));
                    const res = await deleteCuadreRecords(ids);
                    if (res.success) {
                      // Recargar los datos desde la base de datos
                      const updatedRecords = await getCuadreRecords();
                      setSummaryData(updatedRecords);
                      setRowsToDelete(new Set());
                      setIsDeleteMode(false);
                    } else {
                      alert('Error eliminando registros: ' + (res.error ?? ''));
                    }
                  }
                }}
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Eliminar ({rowsToDelete.size})
              </button>
            )}
          </div>
          {/* Tabla de todos los grupos */}
          <div className="overflow-x-auto rounded-lg bg-white shadow-lg">
            <table className="cuadre-table">
              <thead>
                <tr>
                  {isDeleteMode && (
                    <th className="cuadre-header font-lexend relative w-10 border-r bg-white">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <input
                          type="checkbox"
                          ref={selectAllRef}
                          checked={
                            rowsToDelete.size ===
                              groupedRecords.flatMap(([, records]) => records)
                                .length &&
                            groupedRecords.flatMap(([, records]) => records)
                              .length > 0
                          }
                          onChange={() =>
                            handleSelectAll(
                              groupedRecords.flatMap(([, records]) =>
                                records.map((r) => r.id)
                              )
                            )
                          }
                          className="h-4 w-4 rounded border-gray-600"
                        />
                      </div>
                    </th>
                  )}
                  {[
                    'Fecha',
                    'Placa',
                    'Emitido Por',
                    'Asesor',
                    'Tarifa Servicio',
                    'Total (Precio + Tarifa)',
                    'Banco',
                    'Monto',
                    'Fecha Cliente',
                    'Referencia',
                    'Pagado',
                  ].map((header) => (
                    <th
                      key={header}
                      className={
                        header === 'Pagado'
                          ? 'cuadre-header font-lexend relative w-16 border-r bg-white'
                          : 'cuadre-header font-lexend relative border-r bg-white'
                      }
                    >
                      {header === 'Pagado' ? (
                        <span
                          className="font-lexend"
                          style={{ fontSize: '0.7rem' }}
                        >
                          {header}
                        </span>
                      ) : (
                        header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groupedRecords.flatMap(([, records]) =>
                  records.map((record) => (
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
                        {new Date(record.fecha).toLocaleDateString('es-CO')}
                      </td>
                      <td className="cuadre-cell font-lexend font-bold uppercase">
                        {record.placa}
                      </td>
                      <td className="cuadre-cell font-lexend">
                        <div className={getEmitidoPorClass(record.emitidoPor)}>
                          {record.emitidoPor}
                        </div>
                      </td>
                      <td className="cuadre-cell font-lexend font-semibold">
                        {record.asesor}
                      </td>
                      <td className="cuadre-cell font-lexend">
                        ${' '}
                        {Number(record.tarifaServicio).toLocaleString('es-CO')}
                      </td>
                      <td className="cuadre-cell font-lexend font-bold">
                        $
                        {(
                          record.precioNeto + (record.tarifaServicio ?? 0)
                        ).toLocaleString('es-CO')}
                      </td>
                      <td className="cuadre-cell">
                        <select
                          value={
                            editValues[record.id]?.banco ?? record.banco ?? ''
                          }
                          onChange={(e) =>
                            handleLocalEdit(record.id, 'banco', e.target.value)
                          }
                          className="cuadre-select font-lexend text-xs"
                          style={{ fontSize: '0.75rem' }}
                          title={
                            editValues[record.id]?.banco ?? record.banco ?? ''
                          }
                        >
                          <option value="">Seleccionar...</option>
                          {bancoOptions.map((option) => (
                            <option key={option} value={option} title={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="cuadre-cell">
                        <div style={{ position: 'relative', width: '100%' }}>
                          <span
                            style={{
                              position: 'absolute',
                              left: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#888',
                              pointerEvents: 'none',
                              fontSize: '1rem',
                            }}
                          >
                            $
                          </span>
                          <input
                            type="number"
                            value={
                              editValues[record.id]?.monto !== undefined
                                ? editValues[record.id]?.monto === 0
                                  ? ''
                                  : String(Number(editValues[record.id]?.monto))
                                : record.monto === 0 ||
                                    record.monto === undefined ||
                                    record.monto === null
                                  ? ''
                                  : String(Number(record.monto))
                            }
                            onChange={(e) =>
                              handleLocalEdit(
                                record.id,
                                'monto',
                                e.target.value === ''
                                  ? 0
                                  : Number(e.target.value)
                              )
                            }
                            className="cuadre-input font-lexend"
                            style={{
                              paddingLeft: '1.5rem',
                              appearance: 'textfield',
                              WebkitAppearance: 'none',
                              MozAppearance: 'textfield',
                              marginLeft: 0,
                              width: '90%',
                            }}
                          />
                        </div>
                      </td>
                      <td className="cuadre-cell date-column font-lexend">
                        <input
                          type="datetime-local"
                          value={
                            editValues[record.id]?.fechaCliente
                              ? toColombiaDatetimeLocalString(
                                  new Date(
                                    editValues[record.id]?.fechaCliente ?? ''
                                  )
                                )
                              : record.fechaCliente
                                ? toColombiaDatetimeLocalString(
                                    new Date(record.fechaCliente)
                                  )
                                : ''
                          }
                          onChange={(e) =>
                            handleLocalEdit(
                              record.id,
                              'fechaCliente',
                              e.target.value
                                ? fromDatetimeLocalStringToColombiaDate(
                                    e.target.value
                                  )
                                : null
                            )
                          }
                          className="cuadre-input"
                          style={{ width: '100px' }}
                          title={
                            editValues[record.id]?.fechaCliente
                              ? new Date(
                                  editValues[record.id]?.fechaCliente ?? ''
                                ).toLocaleString('es-CO', { hour12: false })
                              : record.fechaCliente
                                ? new Date(record.fechaCliente).toLocaleString(
                                    'es-CO',
                                    { hour12: false }
                                  )
                                : ''
                          }
                        />
                      </td>
                      <td className="cuadre-cell border-r-0">
                        <input
                          type="text"
                          value={
                            editValues[record.id]?.referencia ??
                            record.referencia ??
                            ''
                          }
                          onChange={(e) =>
                            handleLocalEdit(
                              record.id,
                              'referencia',
                              e.target.value
                            )
                          }
                          className="cuadre-input font-lexend"
                        />
                      </td>
                      <td
                        className="cuadre-cell"
                        style={{
                          width: '3.5rem',
                          minWidth: '3.5rem',
                          maxWidth: '3.5rem',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            editValues[record.id]?.pagado ?? !!record.pagado
                          }
                          onChange={(e) =>
                            handleLocalEdit(
                              record.id,
                              'pagado',
                              e.target.checked
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
