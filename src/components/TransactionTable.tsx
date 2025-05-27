'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { useDebouncedSave } from '~/hooks/useDebouncedSave';
import { createRecord } from '~/server/actions/tableGeneral';
import { type TransactionRecord } from '~/types';
import { calculateFormulas } from '~/utils/formulas';
import '~/styles/spinner.css';

import HeaderTitles from './HeaderTitles';

interface SaveResult {
  success: boolean;
  error?: string;
}

type InputValue = string | number | boolean | null;
type InputType = 'text' | 'number' | 'date' | 'checkbox';
type HandleInputChange = (
  id: string,
  field: keyof TransactionRecord,
  value: InputValue
) => void;

function getCurrentDate(): string {
  // Use a fixed date string format to avoid hydration mismatch
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Bogota',
  });
  return formatter.format(today).toUpperCase();
}

export default function TransactionTable({
  initialData,
  onUpdateRecordAction,
}: {
  initialData: TransactionRecord[];
  onUpdateRecordAction: (records: TransactionRecord[]) => Promise<SaveResult>;
}) {
  const [data, setData] = useState<TransactionRecord[]>(initialData);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [totalSelected, setTotalSelected] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDate, setCurrentDate] = useState(getCurrentDate());
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showOriginalScrollbar, setShowOriginalScrollbar] = useState(true);

  const handleRowSelect = (id: string, _precioNeto: number) => {
    const newSelected = new Set(selectedRows);
    const record = data.find((r) => r.id === id);

    if (newSelected.has(id)) {
      newSelected.delete(id);
      setSelectedPlates((prev) => prev.filter((p) => p !== record?.placa));
    } else {
      newSelected.add(id);
      if (record?.placa) {
        setSelectedPlates((prev) => [...prev, record.placa.toUpperCase()]);
      }
    }
    setSelectedRows(newSelected);
  };

  useEffect(() => {
    const total = Array.from(selectedRows).reduce((sum, id) => {
      const record = data.find((r) => r.id === id);
      return sum + (record?.precioNeto ?? 0);
    }, 0);
    setTotalSelected(total);
  }, [selectedRows, data]);

  const handlePay = async () => {
    const updatedData = data.map((record) => {
      if (selectedRows.has(record.id)) {
        return {
          ...record,
          pagado: true,
          boletasRegistradas: totalSelected,
        };
      }
      return record;
    });

    await onUpdateRecordAction(updatedData);
    setData(updatedData);
    setSelectedRows(new Set());
  };

  const addNewRow = async () => {
    const now = new Date();
    const colombiaDate = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/Bogota' })
    );
    const offset = colombiaDate.getTimezoneOffset();
    colombiaDate.setMinutes(colombiaDate.getMinutes() - offset);

    const newRowId = crypto.randomUUID(); // Generar ID aquí
    const newRow: Omit<TransactionRecord, 'id'> = {
      fecha: colombiaDate,
      tramite: '',
      pagado: false,
      boleta: false,
      boletasRegistradas: 0,
      emitidoPor: '',
      placa: '',
      tipoDocumento: '',
      numeroDocumento: '',
      nombre: '',
      cilindraje: null,
      tipoVehiculo: null,
      celular: null,
      ciudad: '',
      asesor: '',
      novedad: null,
      precioNeto: 0,
      comisionExtra: false,
      tarifaServicio: 0,
      impuesto4x1000: 0,
      gananciaBruta: 0,
      rappi: false,
      observaciones: null,
    };

    const result = await createRecord({ ...newRow, id: newRowId }); // Pasar el ID al crear
    if (result.success) {
      const newRowWithId = { ...newRow, id: newRowId };
      setData((prevData) => [newRowWithId, ...prevData]);
      // Forzar un guardado inmediato del nuevo registro
      await handleSaveOperation([newRowWithId, ...data]);
    } else {
      console.error('Error creating new record:', result.error);
    }
  };

  const handleSaveOperation = useCallback(
    async (records: TransactionRecord[]): Promise<SaveResult> => {
      try {
        setIsSaving(true);
        // Solo guardar el registro que ha cambiado
        const result = await onUpdateRecordAction(records);
        if (result.success) {
          // Actualizar el estado local después de guardar exitosamente
          setData(records);
          setUnsavedChanges(false);
        }
        return result;
      } catch (error) {
        console.error('Error saving changes:', error);
        return { success: false, error: 'Failed to save changes' };
      } finally {
        setIsSaving(false);
      }
    },
    [onUpdateRecordAction]
  );

  const handleSaveSuccess = useCallback(() => {
    setUnsavedChanges(false);
    setIsSaving(false);
  }, []);

  const debouncedSave = useDebouncedSave(
    handleSaveOperation,
    handleSaveSuccess,
    2000 // Aumentado a 2 segundos para dar más tiempo de agrupación
  );

  // Type-safe input change handler
  const handleInputChange: HandleInputChange = useCallback(
    (id, field, value) => {
      setData((prevData) => {
        const newData = prevData.map((row) => {
          if (row.id === id) {
            const updatedRow = { ...row };

            switch (field) {
              case 'fecha':
                updatedRow[field] =
                  typeof value === 'string' ? new Date(value) : row.fecha;
                break;
              case 'precioNeto':
              case 'tarifaServicio':
              case 'impuesto4x1000':
              case 'gananciaBruta':
              case 'boletasRegistradas':
              case 'cilindraje':
                updatedRow[field] =
                  typeof value === 'string'
                    ? Number(value) || 0
                    : (value as number);
                break;
              default:
                updatedRow[field] = value as never;
            }
            return updatedRow;
          }
          return row;
        });
        setUnsavedChanges(true);
        void debouncedSave(newData);
        return newData;
      });
    },
    [debouncedSave]
  );

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      const result = await onUpdateRecordAction(data);
      if (result.success) {
        setUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const parseNumber = (value: string): number => {
    // Remover cualquier caracter que no sea número
    const cleanValue = value.replace(/[^\d-]/g, '');
    return Number(cleanValue) || 0;
  };

  const renderInput = useCallback(
    (
      row: TransactionRecord,
      field: keyof TransactionRecord,
      type: InputType = 'text'
    ) => {
      const value = row[field];
      const isMoneyField = [
        'precioNeto',
        'tarifaServicio',
        'impuesto4x1000',
        'gananciaBruta',
        'boletasRegistradas', // Añadido boletasRegistradas como campo monetario
      ].includes(field as string);

      const formatValue = (val: unknown): string => {
        if (val === null || val === undefined) {
          return '';
        }

        // Handle date values with time
        if (type === 'date' && val instanceof Date) {
          const date = new Date(val);
          // Ajustar al horario de Bogotá
          const colombiaDate = new Date(
            date.toLocaleString('en-US', { timeZone: 'America/Bogota' })
          );
          return colombiaDate.toISOString().slice(0, 16);
        }

        // Handle money fields
        if (isMoneyField && typeof val === 'number') {
          return `$ ${formatCurrency(val)}`;
        }

        // Handle primitive types
        switch (typeof val) {
          case 'string':
            return val;
          case 'number':
            return String(val);
          case 'boolean':
            return String(val);
          default:
            return '';
        }
      };

      // Calcular el ancho basado en el tipo de campo
      const getWidth = () => {
        switch (field) {
          case 'nombre':
          case 'observaciones':
            return 'min-w-[250px]';
          case 'tramite':
          case 'emitidoPor':
          case 'ciudad':
          case 'asesor':
            return 'min-w-[180px]';
          case 'tipoDocumento':
          case 'placa':
            return 'min-w-[120px]';
          default:
            return 'min-w-[100px]';
        }
      };

      return (
        <div className={`relative ${isMoneyField ? 'flex items-center' : ''}`}>
          <input
            type={
              isMoneyField ? 'text' : type === 'date' ? 'datetime-local' : type
            }
            value={formatValue(value)}
            checked={type === 'checkbox' ? Boolean(value) : undefined}
            onChange={(e) => {
              let newValue: InputValue;
              if (isMoneyField) {
                newValue = parseNumber(e.target.value);
              } else if (type === 'checkbox') {
                newValue = e.target.checked;
              } else if (type === 'number') {
                newValue = e.target.value ? Number(e.target.value) : null;
              } else {
                newValue = e.target.value || null;
              }
              handleInputChange(row.id, field, newValue);
            }}
            className={`${
              type === 'checkbox'
                ? 'h-4 w-4 rounded border-gray-300'
                : `rounded border p-2 ${getWidth()} ${
                    field === 'placa'
                      ? 'table-text-field text-center uppercase'
                      : type === 'number' || isMoneyField
                        ? 'table-numeric-field'
                        : 'table-text-field'
                  }`
            }`}
          />
        </div>
      );
    },
    [handleInputChange]
  );

  // Group records by date while maintaining insertion order
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, TransactionRecord[]>();

    // Process records in original order
    data.forEach((record) => {
      const dateKey: string =
        record.fecha instanceof Date && !isNaN(record.fecha.getTime())
          ? (record.fecha.toISOString().split('T')[0] ?? '')
          : '';
      const existingGroup = groups.get(dateKey) ?? [];
      // Add new records at the end to maintain oldest-to-newest order
      groups.set(dateKey, [...existingGroup, record]);
    });

    // Sort dates in reverse chronological order (newest first)
    return Array.from(groups.entries()).sort(([dateA], [dateB]) =>
      dateB.localeCompare(dateA)
    );
  }, [data]);

  // Memoize the current date group and related data
  const { currentDateGroup, paginatedData, totalPages } = useMemo(() => {
    const defaultDate = new Date().toISOString().split('T')[0];
    const group = groupedByDate[currentPage - 1] ?? [defaultDate, []];

    return {
      currentDateGroup: group,
      paginatedData: group[1],
      totalPages: groupedByDate.length,
    };
  }, [groupedByDate, currentPage]);

  // Update current date when page changes with safe date handling
  useEffect(() => {
    const dateStr = currentDateGroup[0];
    if (!dateStr) return;

    const date = new Date(`${dateStr}T12:00:00-05:00`);
    if (isNaN(date.getTime())) return;

    const formatter = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Bogota',
    });

    setCurrentDate(formatter.format(date).toUpperCase());
  }, [currentDateGroup]);

  // Add pagination controls component
  const Pagination = () => (
    <div className="mt-4 flex justify-center gap-2">
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Anterior
      </button>
      <span className="flex items-center px-4 text-sm text-gray-700">
        Página {currentPage} de {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Siguiente
      </button>
    </div>
  );

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.1, 0.5);
    setZoom(newZoom);
    setShowOriginalScrollbar(newZoom === 1);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.1, 1);
    setZoom(newZoom);
    setShowOriginalScrollbar(newZoom === 1);
  };

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={addNewRow}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Agregar Registro
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveChanges}
              disabled={!unsavedChanges || isSaving}
              className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
            >
              {isSaving
                ? 'Guardando...'
                : unsavedChanges
                  ? 'Guardar'
                  : 'Guardado'}
            </button>
            {isSaving && (
              <div className="dot-spinner">
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
                <div className="dot-spinner__dot" />
              </div>
            )}
          </div>
          <div className="ml-4 flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
              title="Reducir zoom"
            >
              -
            </button>
            <span className="text-sm text-gray-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
              title="Aumentar zoom"
            >
              +
            </button>
          </div>
        </div>
        <time className="font-display text-2xl text-gray-600">
          {currentDate}
        </time>
      </div>

      <div
        className={`overflow-x-auto shadow-md sm:rounded-lg ${
          showOriginalScrollbar ? '' : 'overflow-x-hidden'
        }`}
      >
        <div
          className="max-h-[calc(100vh-200px)] w-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'left top',
            width: `${(1 / zoom) * 100}%`,
            overflowX: zoom === 1 ? 'auto' : 'scroll',
          }}
        >
          <table className="w-full text-left text-sm text-gray-500">
            <HeaderTitles />
            <tbody>
              {paginatedData.map((row) => {
                const {
                  precioNetoAjustado,
                  tarifaServicioAjustada,
                  impuesto4x1000,
                  gananciaBruta,
                } = calculateFormulas(row);

                const rowWithFormulas = {
                  ...row,
                  precioNeto: precioNetoAjustado,
                  tarifaServicio: tarifaServicioAjustada,
                  impuesto4x1000,
                  gananciaBruta,
                };

                return (
                  <tr
                    key={row.id}
                    className="border-b bg-white hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'fecha', 'date')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'tramite')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleRowSelect(row.id, row.precioNeto)}
                        disabled={row.pagado}
                        className="h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'pagado', 'checkbox')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(
                        rowWithFormulas,
                        'boletasRegistradas',
                        'number'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'emitidoPor')}
                    </td>
                    <td className="px-6 py-4 text-xl whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'placa')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'tipoDocumento')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'numeroDocumento')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'nombre')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'cilindraje', 'number')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'tipoVehiculo')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'celular')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'ciudad')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'asesor')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'novedad')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'precioNeto', 'number')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'tarifaServicio', 'number')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={row.comisionExtra}
                        onChange={(e) =>
                          handleInputChange(
                            row.id,
                            'comisionExtra',
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'impuesto4x1000', 'number')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'gananciaBruta', 'number')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={row.rappi}
                        onChange={(e) =>
                          handleInputChange(row.id, 'rappi', e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderInput(rowWithFormulas, 'observaciones')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination />
      {selectedRows.size > 0 && (
        <div className="fixed right-4 bottom-4 flex w-[400px] flex-col gap-4 rounded-lg bg-white p-6 shadow-lg">
          <div className="text-center">
            <div className="mb-2 font-semibold">
              Total Seleccionado: ${formatCurrency(totalSelected)}
            </div>
            <div className="flex flex-col gap-2 text-base">
              <div>Boletas: {selectedRows.size}</div>
              <div className="font-mono uppercase">
                Placas: {selectedPlates.join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={handlePay}
            className="mt-2 w-full rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Pagar Boletas Seleccionadas
          </button>
        </div>
      )}
    </div>
  );
}
