'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { useDebouncedCallback } from 'use-debounce';

import Header from '~/components/Header';
import {
  deleteCuadreRecords,
  getCuadreRecords,
  updateCuadreRecord,
} from '~/server/actions/cuadreActions';

import CuadreTableBody from './CuadreTableBody';

import type { CuadreData, ExtendedSummaryRecord } from '~/types';

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

  // Agrupar registros por asesor y luego por fecha
  const groupedRecords = useMemo(() => {
    const asesoresMap = new Map<
      string,
      {
        asesor: string;
        fechas: Map<
          string,
          {
            fecha: Date;
            records: ExtendedSummaryRecord[];
          }
        >;
      }
    >();
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
      const asesor = record.asesor ?? 'Sin Asesor';
      const fecha =
        record.fecha instanceof Date ? record.fecha : new Date(record.fecha);
      const fechaStr = fecha.toLocaleDateString('es-CO');
      if (!asesoresMap.has(asesor)) {
        asesoresMap.set(asesor, { asesor, fechas: new Map() });
      }
      const asesorObj = asesoresMap.get(asesor)!;
      if (!asesorObj.fechas.has(fechaStr)) {
        asesorObj.fechas.set(fechaStr, { fecha, records: [] });
      }
      asesorObj.fechas.get(fechaStr)!.records.push(record);
    });
    // Convertir a array ordenado por asesor y por fecha descendente
    return Array.from(asesoresMap.values())
      .map((asesorObj) => ({
        asesor: asesorObj.asesor,
        fechas: Array.from(asesorObj.fechas.values()).sort(
          (a, b) => b.fecha.getTime() - a.fecha.getTime()
        ),
      }))
      .sort((a, b) => a.asesor.localeCompare(b.asesor));
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
      const allIds = groupedRecords.flatMap((asesorGroup) =>
        asesorGroup.fechas.flatMap((fechaGroup) =>
          fechaGroup.records.map((r) => r.id)
        )
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
                          checked={(() => {
                            const allIds = groupedRecords.flatMap(
                              (asesorGroup) =>
                                asesorGroup.fechas.flatMap((fechaGroup) =>
                                  fechaGroup.records.map((r) => r.id)
                                )
                            );
                            return (
                              rowsToDelete.size === allIds.length &&
                              allIds.length > 0
                            );
                          })()}
                          onChange={() =>
                            handleSelectAll(
                              groupedRecords.flatMap((asesorGroup) =>
                                asesorGroup.fechas.flatMap((fechaGroup) =>
                                  fechaGroup.records.map((r) => r.id)
                                )
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
                          ? 'cuadre-header font-lexend relative w-16 border-r bg-white font-semibold'
                          : 'cuadre-header font-lexend relative border-r bg-white'
                      }
                    >
                      {header === 'Pagado' ? (
                        <span
                          className="font-lexend font-semibold"
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
                <CuadreTableBody
                  groupedRecords={groupedRecords}
                  isDeleteMode={isDeleteMode}
                  rowsToDelete={rowsToDelete}
                  editValues={editValues}
                  handleDeleteSelect={handleDeleteSelect}
                  handleLocalEdit={handleLocalEdit}
                  getEmitidoPorClass={getEmitidoPorClass}
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
