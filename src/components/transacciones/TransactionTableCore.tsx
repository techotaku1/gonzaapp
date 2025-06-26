'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useProgress } from '@bprogress/next';
import { useRouter } from '@bprogress/next/app';
import * as XLSX from 'xlsx';

import { useDebouncedSave } from '~/hooks/hook-swr/useDebouncedSave';
import { useDebouncedCallback } from '~/hooks/useDebouncedCallback';
import { toggleAsesorSelectionAction } from '~/server/actions/asesorSelection';
import { createCuadreRecord } from '~/server/actions/cuadreActions';
import { createRecord, deleteRecords } from '~/server/actions/tableGeneral';
import { type TransactionRecord } from '~/types';
import {
  formatColombiaDate,
  getColombiaDate,
  getDateKey,
  toColombiaDate,
} from '~/utils/dateUtils';
import { calculateFormulas } from '~/utils/formulas';
import { calculateSoatPrice, vehicleTypes } from '~/utils/soatPricing';

import AsesorSelect from './AsesorSelect';

export interface SaveResult {
  success: boolean;
  error?: string;
}

export type InputValue = string | number | boolean | Date | null;
export type HandleInputChange = (
  id: string,
  field: keyof TransactionRecord,
  value: InputValue
) => void;

export const getEmitidoPorClass = (value: string): string => {
  if (value.includes('Panel Juan')) return 'emitido-por-panel-juan';
  if (value.includes('Panel Evelio')) return 'emitido-por-panel-evelio';
  if (value.includes('Panel William')) return 'emitido-por-panel-william';
  if (value.includes('Panel Gloria')) return 'emitido-por-panel-gloria';
  if (value.includes('Panel Sebas')) return 'emitido-por-panel-sebas';
  if (value.includes('Panel Yuli')) return 'emitido-por-panel-yuli';
  if (value.includes('Previ usuario')) return 'emitido-por-previ-usuario';
  if (value.includes('Previ pública')) return 'emitido-por-previ-publica';
  if (value.includes('Previ Sonia')) return 'emitido-por-previ-sonia';
  if (value.includes('Bolivar')) return 'emitido-por-bolivar';
  if (value.includes('Axa Sebas')) return 'emitido-por-axa-sebas';
  if (value.includes('Axa Yuli')) return 'emitido-por-axa-yuli';
  if (value.includes('Axa gloria')) return 'emitido-por-axa-gloria';
  if (value.includes('Axa Maryuri')) return 'emitido-por-axa-maryuri';
  if (value.includes('Mundial nave')) return 'emitido-por-mundial-nave';
  if (value.includes('Mundial fel')) return 'emitido-por-mundial-fel';
  if (value.includes('No Emitir')) return 'emitido-por-no-emitir';
  if (value.includes('HH')) return 'emitido-por-hh'; // Nueva clase para HH
  return '';
};

export const emitidoPorOptions = [
  'Panel Juan',
  'Panel Evelio',
  'Panel William',
  'Panel Gloria',
  'Panel Sebas',
  'Panel Yuli',
  'Previ usuario',
  'Previ pública',
  'Previ Sonia',
  'Bolivar suj',
  'Axa Sebas',
  'Axa Yuli',
  'Axa gloria',
  'Axa Maryuri',
  'Mundial nave',
  'Mundial fel',
  'No Emitir',
  'HH', // Nueva opción
] as const;

export type EmitidoPorOption = (typeof emitidoPorOptions)[number];

export const tramiteOptions = ['SOAT'] as const;
export type _TramiteOption = (typeof tramiteOptions)[number];

export const tipoDocumentoOptions = ['CC', 'NIT', 'TI', 'CE', 'PAS'] as const;
export type _TipoDocumentoOption = (typeof tipoDocumentoOptions)[number];

export const novedadOptions = [
  'Inicial',
  'Error Pasajero',
  'Renovacion',
  'Indeterminado',
  'Sin Novedad',
  'Cambio de Categoria',
] as const;

export const tipoVehiculoOptions = vehicleTypes;
export type _TipoVehiculoOption = (typeof tipoVehiculoOptions)[number];

export interface DateGroup extends Array<string | TransactionRecord[]> {
  0: string;
  1: TransactionRecord[];
  date: string;
  records: TransactionRecord[];
  length: 2;
}

export type EditValues = Record<
  string,
  Partial<TransactionRecord> & Record<string, unknown>
>;

export function useTransactionTableCore({
  initialData,
  onUpdateRecordAction,
  showTotals,
  onToggleTotalsAction,
  searchTerm: _searchTermProp = '', // Nueva prop opcional para el término de búsqueda
}: {
  initialData: TransactionRecord[];
  onUpdateRecordAction: (records: TransactionRecord[]) => Promise<SaveResult>;
  showTotals: boolean;
  onToggleTotalsAction: () => void;
  searchTerm?: string;
}) {
  const router = useRouter();
  const progress = useProgress();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [totalSelected, setTotalSelected] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [_selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [dateFilter, setDateFilter] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({ startDate: null, endDate: null });
  const [hasSearchResults, setHasSearchResults] = useState(false);
  const [isAsesorSelectionMode, setIsAsesorSelectionMode] = useState(false);
  const [selectedAsesores, setSelectedAsesores] = useState<Set<string>>(
    new Set()
  );
  const [_currentDateDisplay, setCurrentDateDisplay] = useState('');

  const [isLoadingAsesorMode, setIsLoadingAsesorMode] = useState(false);
  const [isNavigatingToCuadre, setIsNavigatingToCuadre] = useState(false);
  const [searchTerm, setSearchTermAction] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [searchTrigger] = useState(0);
  const debouncedSetSearchTerm = useDebouncedCallback((...args: unknown[]) => {
    const value = args[0];
    if (typeof value === 'string') {
      setDebouncedSearchTerm(value);
    }
  }, 350);

  const [isActuallySaving, setIsActuallySaving] = useState(false);
  const pendingEdits = useRef<EditValues>({});

  const createDateGroup = useCallback(
    (date: string, records: TransactionRecord[]): DateGroup => {
      const group = [date, records] as const;
      return Object.assign(group, {
        date,
        records,
        [Symbol.iterator]: Array.prototype[Symbol.iterator],
      }) as DateGroup;
    },
    []
  );

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, TransactionRecord[]>();
    const dataToGroup = [...initialData];
    dataToGroup.forEach((record) => {
      if (!(record.fecha instanceof Date)) return;
      const dateKey = getDateKey(record.fecha);
      if (!dateKey) return;
      const existingGroup = groups.get(dateKey) ?? [];
      groups.set(dateKey, [...existingGroup, record]);
    });
    groups.forEach((records, key) => {
      const sortedRecords = records.sort((a, b) => {
        const dateA = toColombiaDate(new Date(b.fecha));
        const dateB = toColombiaDate(new Date(a.fecha));
        return dateA.getTime() - dateB.getTime();
      });
      groups.set(key, sortedRecords);
    });
    return Array.from(groups.entries())
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, records]) => createDateGroup(date, records));
  }, [initialData, createDateGroup]);

  useEffect(() => {
    if (Object.keys(pendingEdits.current).length === 0) {
      setSelectedRows((prevSelected) => {
        const newSelected = new Set(prevSelected);
        initialData.forEach((row) => {
          if (newSelected.has(row.id)) {
            const existingRow = initialData.find((r) => r.id === row.id);
            if (!existingRow) {
              newSelected.add(row.id);
            }
          }
        });
        return newSelected;
      });
    }
  }, [initialData, pendingEdits]);

  const handleSaveSuccess = useCallback(() => {
    setIsActuallySaving(false);
  }, [setIsActuallySaving]);

  const debouncedSave = useDebouncedSave(
    async (records: TransactionRecord[]) => {
      try {
        const result = await onUpdateRecordAction(records);
        return result;
      } catch (error) {
        console.error('Error saving:', error);
        return { success: false, error: 'Failed to save changes' };
      }
    },
    handleSaveSuccess,
    800
  );

  const [editValues, setEditValues] = useState<EditValues>({});

  const handleInputChange: HandleInputChange = useCallback(
    (id, field, value) => {
      setEditValues((prev: EditValues) => {
        const prevEdits = prev[id] ?? {};
        let newValue = value;
        if (
          [
            'precioNeto',
            'tarifaServicio',
            'impuesto4x1000',
            'gananciaBruta',
            'boletasRegistradas',
            'cilindraje',
          ].includes(field as string)
        ) {
          newValue = typeof value === 'string' ? Number(value) || 0 : value;
        }
        const extra: Partial<TransactionRecord> = {};
        if (
          (field === 'tipoVehiculo' || field === 'cilindraje') &&
          (field === 'tipoVehiculo'
            ? newValue
            : prevEdits.tipoVehiculo ||
              initialData.find((r) => r.id === id)?.tipoVehiculo)
        ) {
          const tipoVehiculo =
            field === 'tipoVehiculo'
              ? newValue
              : (prevEdits.tipoVehiculo ??
                initialData.find((r) => r.id === id)?.tipoVehiculo);
          const cilindraje =
            field === 'cilindraje'
              ? newValue
              : typeof prevEdits.cilindraje === 'number' ||
                  prevEdits.cilindraje === null
                ? prevEdits.cilindraje
                : initialData.find((r) => r.id === id)?.cilindraje;
          const soatPrice = calculateSoatPrice(
            tipoVehiculo as string,
            cilindraje as number | null
          );
          if (soatPrice > 0) {
            extra.precioNeto = soatPrice;
          }
        }
        const updated = {
          ...prev,
          [id]: { ...prevEdits, [field]: newValue, ...extra },
        };

        const recordsToUpdate = Object.entries(updated).map(
          ([recordId, edits]) => {
            const baseRecord =
              initialData.find((r) => r.id === recordId) ??
              ({} as TransactionRecord);
            return { ...baseRecord, ...edits } as TransactionRecord;
          }
        );

        setIsActuallySaving(true);
        debouncedSave(recordsToUpdate);
        return updated;
      });
      if (field === 'fecha' && value) {
        const dateStr = (
          value instanceof Date ? value : new Date(value as string)
        )
          .toISOString()
          .split('T')[0];
        const pageIndex = groupedByDate.findIndex(
          ([gDate]) => gDate === dateStr
        );
        if (pageIndex !== -1) {
          setCurrentPage(pageIndex + 1);
        }
      }
    },
    [initialData, groupedByDate, debouncedSave, setIsActuallySaving]
  );

  const handleRowSelect = (id: string, _precioNeto: number) => {
    const newSelected = new Set(selectedRows);
    const record = initialData.find((r) => r.id === id);

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
      const record = initialData.find((r) => r.id === id);
      return sum + (record?.precioNeto ?? 0);
    }, 0);
    setTotalSelected(total);
  }, [selectedRows, initialData]);

  const handlePay = async () => {
    const updatedData = initialData.map((record) => {
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
    setSelectedRows(new Set());
  };

  const addNewRow = async () => {
    progress.start(0.3);
    setIsAddingRow(true);
    try {
      const now = new Date();
      now.setHours(now.getHours() - 5);
      const colombiaDate = now;
      const newRowId = crypto.randomUUID();
      const newRow: Omit<TransactionRecord, 'id'> = {
        fecha: colombiaDate,
        tramite: 'SOAT',
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

      const result = await createRecord({ ...newRow, id: newRowId });
      if (result.success) {
        const newRowWithId = { ...newRow, id: newRowId };
        const dateKey = getDateKey(colombiaDate);
        const newGroupedData = groupedByDate.map((group) => {
          if (group[0] === dateKey) {
            return [group[0], [newRowWithId, ...group[1]]];
          }
          return group;
        });

        if (!newGroupedData.find((group) => group[0] === dateKey)) {
          newGroupedData.unshift(createDateGroup(dateKey, [newRowWithId]));
        }

        setCurrentPage(1); // Volver a la primera página
        await handleSaveOperation([newRowWithId, ...initialData]);
      } else {
        console.error('Error creating new record:', result.error);
      }
    } finally {
      setIsAddingRow(false);
      progress.stop();
    }
  };

  const handleSaveOperation = useCallback(
    async (records: TransactionRecord[]): Promise<SaveResult> => {
      try {
        const result = await onUpdateRecordAction(records);
        if (result.success) {
          setSelectedRows((prevSelected) => {
            const newSelected = new Set(prevSelected);
            records.forEach((record) => {
              if (newSelected.has(record.id)) {
                const existingRow = initialData.find((r) => r.id === record.id);
                if (!existingRow) {
                  newSelected.add(record.id);
                }
              }
            });
            return newSelected;
          });
        }
        return result;
      } catch (error: unknown) {
        let errorMsg = 'Failed to save changes';
        if (error instanceof Error) {
          errorMsg = error.message;
          console.error('Error saving changes:', error.message);
        } else {
          console.error('Error saving changes:', error);
        }
        return { success: false, error: errorMsg };
      }
    },
    [onUpdateRecordAction, initialData]
  );

  const filteredData = useMemo(() => {
    if (dateFilter.startDate && dateFilter.endDate) {
      const filtered = initialData.filter((record) => {
        const recordDate = getColombiaDate(new Date(record.fecha));
        if (dateFilter.startDate && dateFilter.endDate) {
          const startDate = getColombiaDate(dateFilter.startDate);
          const endDate = getColombiaDate(dateFilter.endDate);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          return recordDate >= startDate && recordDate <= endDate;
        }
        return true;
      });
      setHasSearchResults(filtered.length > 0);
      return filtered;
    } else if (debouncedSearchTerm) {
      const search = debouncedSearchTerm.toLowerCase();
      const filtered = initialData.filter((item) =>
        Object.entries(item).some(([key, value]) => {
          if (key === 'fecha' || value === null) return false;
          return String(value).toLowerCase().includes(search);
        })
      );
      setHasSearchResults(filtered.length > 0);
      return filtered;
    } else {
      setHasSearchResults(initialData.length > 0);
      return initialData;
    }
  }, [initialData, dateFilter, debouncedSearchTerm]);

  const paginatedData: TransactionRecord[] = useMemo(() => {
    if (debouncedSearchTerm || (dateFilter.startDate && dateFilter.endDate)) {
      return filteredData;
    }
    const currentGroup = groupedByDate[currentPage - 1] as
      | DateGroup
      | undefined;
    return currentGroup ? currentGroup.records : [];
  }, [
    groupedByDate,
    currentPage,
    dateFilter,
    filteredData,
    debouncedSearchTerm,
  ]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const parseNumber = (value: string): number => {
    const cleanValue = value.replace(/[^\d-]/g, '');
    return Number(cleanValue) || 0;
  };

  const renderInput = useCallback(
    (
      row: TransactionRecord,
      field: keyof TransactionRecord,
      type: InputType = 'text'
    ) => {
      const value =
        editValues[row.id] && editValues[row.id][field] !== undefined
          ? editValues[row.id][field]
          : row[field];
      const isMoneyField = [
        'precioNeto',
        'tarifaServicio',
        'impuesto4x1000',
        'gananciaBruta',
        'boletasRegistradas', // Añadido boletasRegistradas como campo monetario
      ].includes(field as string);

      let adjustedValue = value;
      if (
        field === 'precioNeto' ||
        field === 'tarifaServicio' ||
        field === 'impuesto4x1000' ||
        field === 'gananciaBruta'
      ) {
        const editedRow = { ...row, ...(editValues[row.id] || {}) };
        const formulas = calculateFormulas(editedRow);
        if (field === 'precioNeto') adjustedValue = formulas.precioNetoAjustado;
        if (field === 'tarifaServicio')
          adjustedValue = formulas.tarifaServicioAjustada;
        if (field === 'impuesto4x1000') adjustedValue = formulas.impuesto4x1000;
        if (field === 'gananciaBruta') adjustedValue = formulas.gananciaBruta;
      }

      const formatValue = (val: unknown): string => {
        if (val === null || val === undefined) {
          return '';
        }

        if (field === 'fecha' && val instanceof Date) {
          try {
            const date = val;
            return date.toISOString().slice(0, 16);
          } catch (error) {
            console.error('Error formatting date:', error);
            return '';
          }
        }

        // Format cilindraje with thousands separator
        if (field === 'cilindraje' && typeof val === 'number') {
          return formatCurrency(val);
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

      const getWidth = () => {
        switch (field) {
          case 'impuesto4x1000':
            return 'w-[70px]'; // Aumentado el ancho para 4x1000
          case 'gananciaBruta':
            return 'w-[90px]'; // Aumentado el ancho para ganancia bruta
          case 'novedad':
            return 'w-[100px]'; // Aumentado el ancho para novedad
          case 'precioNeto':
          case 'tarifaServicio':
            return 'w-[80px]';
          case 'tipoVehiculo':
            return 'w-[90px]';
          case 'boletasRegistradas':
            return 'w-[100px]';
          case 'placa':
            return 'w-[80px]';
          case 'nombre':
          case 'observaciones':
            return 'w-[100px]';
          case 'tramite':
            return 'w-[70px]';
          case 'emitidoPor':
            return 'w-[70px]';
          case 'ciudad':
            return 'w-[70px]';
          case 'asesor':
            return 'w-[100px]';
          case 'tipoDocumento':
            return 'w-[70px]';
          case 'fecha':
            return 'w-[60px]';
          case 'numeroDocumento':
          case 'celular':
            return 'w-[65px]';
          case 'cilindraje':
            return 'w-[50px]';
          default:
            return 'w-[50px]';
        }
      };

      if (field === 'emitidoPor') {
        return (
          <select
            value={value as string}
            onChange={(e) => handleInputChange(row.id, field, e.target.value)}
            className={`table-select-base w-[105px] rounded border ${getEmitidoPorClass(value as string)}`}
            title={value as string}
          >
            <option value="">Seleccionar...</option>
            {emitidoPorOptions.map((option: EmitidoPorOption) => (
              <option
                key={option}
                value={option}
                className={`text-center ${getEmitidoPorClass(option)}`}
              >
                {option}
              </option>
            ))}
          </select>
        );
      }

      if (field === 'fecha') {
        return (
          <div className="relative flex w-full items-center justify-center">
            <input
              type="datetime-local"
              value={formatValue(value)}
              onChange={(e) => {
                try {
                  const inputDate = new Date(`${e.target.value}:00Z`);
                  handleInputChange(row.id, field, inputDate);
                } catch (error) {
                  console.error('Error converting date:', error);
                }
              }}
              className="table-date-field flex w-[140px] cursor-pointer items-center justify-center rounded border px-0 py-0.5 text-center text-[10px]"
            />
          </div>
        );
      }

      const renderPlacaInput = () => (
        <div className="relative flex items-center">
          <input
            type="text"
            value={formatValue(value)}
            title={formatValue(value)}
            onChange={(e) =>
              handleInputChange(row.id, field, e.target.value.toUpperCase())
            }
            className="placa-field w-[80px] cursor-pointer overflow-hidden rounded border bg-yellow-500 hover:overflow-visible hover:text-clip"
          />
        </div>
      );

      if (field === ('placa' as keyof TransactionRecord)) {
        return renderPlacaInput();
      }

      if (field === 'tipoDocumento') {
        return (
          <select
            value={value as string}
            onChange={(e) => handleInputChange(row.id, field, e.target.value)}
            className="table-select-base w-[70px] rounded border border-gray-600"
            title={value as string}
          >
            <option value="">-</option>
            {tipoDocumentoOptions.map((option) => (
              <option key={option} value={option} className="text-center">
                {option}
              </option>
            ))}
          </select>
        );
      }

      if (field === 'tramite') {
        return (
          <select
            value={value as string}
            onChange={(e) => handleInputChange(row.id, field, e.target.value)}
            className="table-select-base w-[70px] rounded border border-gray-600"
            title={value as string}
          >
            {tramiteOptions.map((option) => (
              <option key={option} value={option} className="text-center">
                {option}
              </option>
            ))}
          </select>
        );
      }

      if (field === 'tipoVehiculo') {
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => handleInputChange(row.id, field, e.target.value)}
            className="table-select-base w-[150px] rounded border border-gray-600"
            title={value as string}
          >
            <option value="">Seleccionar...</option>
            {tipoVehiculoOptions.map((option: string) => (
              <option
                key={option}
                value={option}
                className="text-center"
                title={option} // Añadir título también a las opciones
              >
                {option}
              </option>
            ))}
          </select>
        );
      }

      if (field === 'novedad') {
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => handleInputChange(row.id, field, e.target.value)}
            className="table-select-base w-[120px] rounded border border-gray-600"
            title={value as string} // El título mostrará el texto completo al hacer hover
          >
            <option value="">Seleccionar...</option>
            {novedadOptions.map((option) => (
              <option
                key={option}
                value={option}
                className="text-center"
                title={option} // Añadir título también a las opciones
              >
                {option}
              </option>
            ))}
          </select>
        );
      }

      // Usar adjustedValue en vez de value en los inputs de dinero
      if (
        field === 'precioNeto' ||
        field === 'tarifaServicio' ||
        field === 'impuesto4x1000' ||
        field === 'gananciaBruta'
      ) {
        return (
          <div className={`relative flex items-center`}>
            <input
              type="text"
              value={formatValue(adjustedValue)}
              title={formatValue(adjustedValue)}
              onChange={(e) => {
                const newValue: InputValue = parseNumber(e.target.value);
                handleInputChange(row.id, field, newValue);
              }}
              className={`flex items-center justify-center overflow-hidden rounded border px-0.5 py-0.5 text-center text-[10px] text-ellipsis ${getWidth()} table-numeric-field hover:overflow-visible hover:text-clip`}
            />
          </div>
        );
      }

      if (field === 'asesor') {
        return (
          <AsesorSelect
            value={String(value ?? '')}
            onChange={(newValue) =>
              handleInputChange(row.id, 'asesor', newValue)
            }
          />
        );
      }

      return (
        <div className={`relative ${isMoneyField ? 'flex items-center' : ''}`}>
          <input
            type={
              field === 'cilindraje'
                ? 'text'
                : field === 'numeroDocumento' || field === 'celular'
                  ? 'text'
                  : isMoneyField
                    ? 'text'
                    : type === 'date'
                      ? 'datetime-local'
                      : type
            }
            value={formatValue(value)}
            title={formatValue(value)} // Agregar tooltip a todos los inputs
            onChange={(e) => {
              let newValue: InputValue;
              if (field === 'cilindraje') {
                // Permitir borrar completamente (null si vacío)
                newValue =
                  e.target.value === '' ? null : parseNumber(e.target.value);
              } else if (field === 'numeroDocumento' || field === 'celular') {
                // Solo permitir números
                const onlyNumbers = e.target.value.replace(/[^\d]/g, '');
                newValue = onlyNumbers === '' ? null : onlyNumbers;
              } else if (isMoneyField) {
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
            className={`$${
              type === 'checkbox'
                ? 'h-3 w-3 rounded border-gray-600'
                : `flex items-center justify-center overflow-hidden rounded border px-0.5 py-0.5 text-center text-[10px] text-ellipsis ${getWidth()} ${
                    field === 'cilindraje'
                      ? '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                      : ''
                  } ${
                    field === 'placa'
                      ? 'table-text-field h-[1.5rem] leading-[1.5rem] uppercase'
                      : type === 'number' || isMoneyField
                        ? 'table-numeric-field'
                        : 'table-text-field'
                  } hover:overflow-visible hover:text-clip`
            }`}
            inputMode={
              field === 'numeroDocumento' || field === 'celular'
                ? 'numeric'
                : undefined
            }
            pattern={
              field === 'numeroDocumento' || field === 'celular'
                ? '\\d*'
                : undefined
            }
          />
        </div>
      );
    },
    [handleInputChange, editValues]
  );

  useEffect(() => {
    if (Object.keys(pendingEdits.current).length === 0) {
      setSelectedRows((prevSelected) => {
        const newSelected = new Set(prevSelected);
        initialData.forEach((row) => {
          if (newSelected.has(row.id)) {
            const existingRow = initialData.find((r) => r.id === row.id);
            if (!existingRow) {
              newSelected.add(row.id);
            }
          }
        });
        return newSelected;
      });
    }
  }, [initialData, pendingEdits]);

  const { currentDateGroup } = useMemo(() => {
    const defaultDate = new Date().toISOString().split('T')[0]!;
    const defaultGroup = createDateGroup(defaultDate, []);

    return {
      currentDateGroup: groupedByDate[currentPage - 1] ?? defaultGroup,
    };
  }, [groupedByDate, currentPage, createDateGroup]);

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

    setCurrentDateDisplay(formatter.format(date).toUpperCase());
  }, [currentDateGroup]);

  function DatePagination({
    groupedByDate,
    currentPage,
    setCurrentPage,
    dateFilter,
  }: {
    groupedByDate: DateGroup[];
    currentPage: number;
    setCurrentPage: (page: number) => void;
    dateFilter: { startDate: Date | null; endDate: Date | null };
  }) {
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

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.1, 0.5);
      return newZoom;
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.min(prev + 0.1, 1);
      return newZoom;
    });
  }, []);

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

  const handleDeleteSelected = async () => {
    if (rowsToDelete.size === 0) return;

    if (confirm(`¿Está seguro de eliminar ${rowsToDelete.size} registros?`)) {
      const result = await deleteRecords(Array.from(rowsToDelete));
      if (result.success) {
        setSelectedRows((prevSelected) => {
          const newSelected = new Set(prevSelected);
          rowsToDelete.forEach((id) => newSelected.delete(id));
          return newSelected;
        });
        setRowsToDelete(new Set());
        setIsDeleteMode(false);
      } else {
        alert('Error al eliminar registros');
      }
    }
  };

  const renderCheckbox = useCallback(
    (
      id: string,
      field: keyof TransactionRecord,
      value: boolean,
      disabled?: boolean
    ) => (
      <label className="check-label">
        <input
          type="checkbox"
          checked={value}
          disabled={disabled}
          onChange={(e) => handleInputChange(id, field, e.target.checked)}
          className="sr-only"
        />
        <div className="checkmark" />
      </label>
    ),
    [handleInputChange]
  );

  const handleExport = useCallback(
    (startDate: Date, endDate: Date) => {
      try {
        const colombiaTimeZone = 'America/Bogota';
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredData = initialData.filter((record) => {
          const recordDate = new Date(record.fecha);
          const colombiaDate = new Date(
            recordDate.toLocaleString('en-US', { timeZone: colombiaTimeZone })
          );

          return colombiaDate >= start && colombiaDate <= end;
        });

        if (filteredData.length === 0) {
          alert(
            'No hay datos para exportar en el rango de fechas seleccionado'
          );
          return;
        }

        const sortedData = [...filteredData].sort(
          (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );

        const excelData = sortedData.map((record) => {
          const {
            precioNetoAjustado,
            tarifaServicioAjustada,
            impuesto4x1000,
            gananciaBruta,
          } = calculateFormulas(record);

          const fecha = new Date(record.fecha);
          const fechaColombia = new Date(
            fecha.toLocaleString('en-US', { timeZone: colombiaTimeZone })
          );

          return {
            Fecha: fechaColombia.toLocaleString('es-CO', {
              dateStyle: 'short',
              timeStyle: 'short',
              timeZone: colombiaTimeZone,
            }),
            Trámite: record.tramite,
            Pagado: record.pagado ? 'Sí' : 'No',
            'Boletas Registradas': record.boletasRegistradas,
            'Emitido Por': record.emitidoPor,
            Placa: record.placa.toUpperCase(),
            'Tipo Documento': record.tipoDocumento,
            'Número Documento': record.numeroDocumento,
            Nombre: record.nombre,
            Cilindraje: record.cilindraje,
            'Tipo Vehículo': record.tipoVehiculo,
            Celular: record.celular,
            Ciudad: record.ciudad,
            Asesor: record.asesor,
            Novedad: record.novedad,
            'Precio Neto': precioNetoAjustado,
            'Comisión Extra': record.comisionExtra ? 'Sí' : 'No',
            'Tarifa Servicio': tarifaServicioAjustada,
            '4x1000': impuesto4x1000,
            'Ganancia Bruta': gananciaBruta,
            Rappi: record.rappi ? 'Sí' : 'No',
            Observaciones: record.observaciones,
          };
        });

        const ws = XLSX.utils.json_to_sheet(excelData);

        const colWidths = [
          { wch: 20 }, // Fecha
          { wch: 15 }, // Trámite
          { wch: 8 }, // Pagado
          { wch: 15 }, // Boletas Registradas
          { wch: 15 }, // Emitido Por
          { wch: 10 }, // Placa
          { wch: 12 }, // Tipo Documento
          { wch: 15 }, // Número Documento
          { wch: 30 }, // Nombre
          { wch: 10 }, // Cilindraje
          { wch: 15 }, // Tipo Vehículo
          { wch: 12 }, // Celular
          { wch: 15 }, // Ciudad
          { wch: 20 }, // Asesor
          { wch: 20 }, // Novedad
          { wch: 12 }, // Precio Neto
          { wch: 12 }, // Comisión Extra
          { wch: 12 }, // Tarifa Servicio
          { wch: 10 }, // 4x1000
          { wch: 12 }, // Ganancia Bruta
          { wch: 8 }, // Rappi
          { wch: 40 }, // Observaciones
        ];

        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registros');

        const formatDateForFileName = (date: Date) => {
          return date
            .toLocaleDateString('es-CO', {
              timeZone: colombiaTimeZone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
            .replace(/\//g, '-');
        };

        const fileName = `registros_${formatDateForFileName(start)}_a_${formatDateForFileName(end)}.xlsx`;
        XLSX.writeFile(wb, fileName);
      } catch (error: unknown) {
        console.error('Error al exportar:', error);
        if (error instanceof Error) {
          alert(`Error al exportar los datos: ${error.message}`);
        } else {
          alert('Error al exportar los datos');
        }
      }
    },
    [initialData]
  );

  const handleFilterData = useCallback(
    (results: TransactionRecord[], searchValue?: string) => {
      setHasSearchResults(results.length > 0);
      if (typeof searchValue === 'string') {
        setSearchTermAction(searchValue);
      }
    },
    []
  );

  const updateDateDisplay = useCallback(
    (startDate: Date | null, endDate: Date | null) => {
      const dateElement = document.getElementById('current-date-display');
      if (!dateElement) return;

      if (startDate && endDate) {
        const formatDate = (date: Date) => {
          return new Intl.DateTimeFormat('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/Bogota',
          })
            .format(date)
            .toUpperCase();
        };

        dateElement.textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
      } else {
        const currentGroup = groupedByDate[currentPage - 1];
        if (currentGroup) {
          const [dateStr] = currentGroup;
          if (dateStr) {
            const date = new Date(`${dateStr}T12:00:00-05:00`);
            if (!isNaN(date.getTime())) {
              dateElement.textContent = formatColombiaDate(date);
            }
          }
        }
      }
    },
    [currentPage, groupedByDate]
  );

  useEffect(() => {
    updateDateDisplay(dateFilter.startDate, dateFilter.endDate);
  }, [dateFilter, currentPage, updateDateDisplay]);

  const handleDateFilterChange = useCallback(
    (startDate: Date | null, endDate: Date | null) => {
      setDateFilter({ startDate, endDate });
      updateDateDisplay(startDate, endDate);
    },
    [updateDateDisplay]
  );

  const handleAsesorSelection = useCallback((id: string, _asesor: string) => {
    setSelectedAsesores((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const renderAsesorSelect = useCallback(
    (row: TransactionRecord) => {
      if (!isAsesorSelectionMode) return null;

      return (
        <div className="flex items-center gap-2">
          <div className="table-checkbox-wrapper">
            <label className="check-label">
              <input
                type="checkbox"
                checked={selectedAsesores.has(row.id)}
                onChange={() => handleAsesorSelection(row.id, row.asesor)}
                className="sr-only"
              />
              <div className="checkmark" />
            </label>
          </div>
          {renderInput(row, 'asesor')}
        </div>
      );
    },
    [
      isAsesorSelectionMode,
      selectedAsesores,
      handleAsesorSelection,
      renderInput,
    ]
  );

  const _TableHeader = useCallback(() => {
    return (
      <tr>
        {isDeleteMode ? <th className="table-header">Eliminar</th> : null}
        <th className="table-header">Fecha</th>
        <th className="table-header">Trámite</th>
        <th className="table-header">Seleccionar</th>
        <th className="table-header">Pagado</th>
        <th className="table-header">Boletas Registradas</th>
        <th className="table-header">Emitido Por</th>
        <th className="table-header">Placa</th>
        <th className="table-header">Tipo Documento</th>
        <th className="table-header">Número Documento</th>
        <th className="table-header">Nombre</th>
        <th className="table-header">Cilindraje</th>
        <th className="table-header">Tipo Vehículo</th>
        <th className="table-header">Celular</th>
        <th className="table-header">Ciudad</th>
        <th className="table-header">Asesor</th>
        <th className="table-header">Novedad</th>
        <th className="table-header">Precio Neto</th>
        <th className="table-header">Comisión Extra</th>
        <th className="table-header">Tarifa Servicio</th>
        <th className="table-header">4x1000</th>
        <th className="table-header">Ganancia Bruta</th>
        <th className="table-header">Rappi</th>
        <th className="table-header">Observaciones</th>
        {isAsesorSelectionMode ? (
          <th className="table-header">Seleccionar Asesor</th>
        ) : null}
      </tr>
    );
  }, [isDeleteMode, isAsesorSelectionMode]);

  const handleToggleAsesorMode = useCallback(async () => {
    try {
      setIsLoadingAsesorMode(true);
      const result = await toggleAsesorSelectionAction();
      if (result.success) {
        setIsAsesorSelectionMode((prev) => !prev);
        setSelectedAsesores(new Set());
      }
    } catch (error) {
      console.error('Error toggling asesor selection:', error);
    } finally {
      setIsLoadingAsesorMode(false);
    }
  }, []);

  const handleNavigateToCuadre = useCallback(() => {
    setIsNavigatingToCuadre(true);
    setZoom(0.5); // Hace zoom out
    setTimeout(() => {
      router.push('/cuadre', { startPosition: 0.3 });
    }, 500); // Espera medio segundo para que se vea la animación
  }, [router]);

  const [isTotalsButtonLoading, setIsTotalsButtonLoading] = useState(false);

  const handleToggleTotals = useCallback(() => {
    setIsTotalsButtonLoading(true);
    setTimeout(() => {
      onToggleTotalsAction();
      setIsTotalsButtonLoading(false);
    }, 400); // Duración de la animación/spinner
  }, [onToggleTotalsAction]);

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm, debouncedSetSearchTerm]);

  return {
    selectedRows,
    setSelectedRows,
    totalSelected,
    setTotalSelected,
    currentPage,
    setCurrentPage,
    _selectedPlates,
    setSelectedPlates,
    zoom,
    setZoom,
    isDeleteMode,
    setIsDeleteMode,
    rowsToDelete,
    setRowsToDelete,
    isExportModalOpen,
    setIsExportModalOpen,
    isAddingRow,
    setIsAddingRow,
    dateFilter,
    setDateFilter,
    hasSearchResults,
    setHasSearchResults,
    isAsesorSelectionMode,
    setIsAsesorSelectionMode,
    selectedAsesores,
    setSelectedAsesores,
    _currentDateDisplay,
    setCurrentDateDisplay,
    isLoadingAsesorMode,
    setIsLoadingAsesorMode,
    isNavigatingToCuadre,
    setIsNavigatingToCuadre,
    searchTerm,
    setSearchTermAction,
    debouncedSearchTerm,
    setDebouncedSearchTerm,
    searchTrigger,
    debouncedSetSearchTerm,
    isActuallySaving,
    setIsActuallySaving,
    pendingEdits,
    createDateGroup,
    groupedByDate,
    initialData,
    onUpdateRecordAction,
    showTotals,
    onToggleTotalsAction,
    handleSaveSuccess,
    debouncedSave,
    editValues,
    setEditValues,
    handleInputChange,
    handleRowSelect,
    handleDeleteModeToggle,
    handleDeleteSelect,
    handleDeleteSelected,
    renderCheckbox,
    handleExport,
    handleFilterData,
    updateDateDisplay,
    handleDateFilterChange,
    handleAsesorSelection,
    renderAsesorSelect,
    _TableHeader,
    handleToggleAsesorMode,
    handleNavigateToCuadre,
    handleToggleTotals,
  };
}
