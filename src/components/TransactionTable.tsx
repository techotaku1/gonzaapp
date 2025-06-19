'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useProgress } from '@bprogress/next';
import { useRouter } from '@bprogress/next/app';
import { BiWorld } from 'react-icons/bi';
import { MdOutlineTableChart } from 'react-icons/md';
import { useDebouncedCallback } from 'use-debounce';
import * as XLSX from 'xlsx';

import { useDebouncedSave } from '~/hooks/useDebouncedSave';
import { toggleAsesorSelectionAction } from '~/server/actions/asesorSelection';
import { createRecord, deleteRecords } from '~/server/actions/tableGeneral';
import { type TransactionRecord } from '~/types';
import { bancoOptions } from '~/utils/constants';
import { getColombiaDate, getDateKey, toColombiaDate } from '~/utils/dateUtils';
import { calculateFormulas } from '~/utils/formulas';
import { calculateSoatPrice, vehicleTypes } from '~/utils/soatPricing';

import ExportDateRangeModal from './ExportDateRangeModal';
import HeaderTitles from './HeaderTitles';
import { Icons } from './icons';
import SearchControls from './SearchControls';
import TransactionTotals from './TransactionTotals';

import '~/styles/buttonLoader.css';
import '~/styles/deleteButton.css';
import '~/styles/exportButton.css';
import '~/styles/buttonSpinner.css';

interface SaveResult {
  success: boolean;
  error?: string;
}

type InputValue = string | number | boolean | Date | null;
type InputType = 'text' | 'number' | 'date' | 'checkbox';
type HandleInputChange = (
  id: string,
  field: keyof TransactionRecord,
  value: InputValue
) => void;

const getEmitidoPorClass = (value: string): string => {
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
  return '';
};

const emitidoPorOptions = [
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
] as const;

type EmitidoPorOption = (typeof emitidoPorOptions)[number];

// Change these type definitions to be used
const tramiteOptions = ['SOAT'] as const;
type _TramiteOption = (typeof tramiteOptions)[number];

const tipoDocumentoOptions = ['CC', 'NIT', 'TI', 'CE', 'PAS'] as const;
type _TipoDocumentoOption = (typeof tipoDocumentoOptions)[number];

const novedadOptions = [
  'Inicial',
  'Error Pasajero',
  'Renovacion',
  'Indeterminado',
  'Sin Novedad',
  'Cambio de Categoria',
] as const;

// Actualizar la definición de tipoVehiculoOptions para usar los valores del sistema de precios
const tipoVehiculoOptions = vehicleTypes;
type _TipoVehiculoOption = (typeof tipoVehiculoOptions)[number];

const formatColombiaDate = (date: Date): string => {
  const colombiaDate = getColombiaDate(date);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Bogota',
  })
    .format(colombiaDate)
    .toUpperCase();
};

export default function TransactionTable({
  initialData,
  onUpdateRecordAction,
}: {
  initialData: TransactionRecord[];
  onUpdateRecordAction: (records: TransactionRecord[]) => Promise<SaveResult>;
}) {
  const router = useRouter();
  const progress = useProgress();
  const [data, setData] = useState<TransactionRecord[]>(initialData);
  const [filteredData, setFilteredData] = useState<TransactionRecord[]>(data);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [totalSelected, setTotalSelected] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [_selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [showTotals, setShowTotals] = useState(false);
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

  // Add a ref to always keep the latest data for debounced save
  const latestDataRef = useRef<TransactionRecord[]>(initialData);

  // Cambia la lógica para que el indicador "Guardando cambios..." solo se muestre cuando realmente se está guardando (no cuando el usuario está editando).
  // Se logra con un nuevo estado: isActuallySaving

  const [isActuallySaving, setIsActuallySaving] = useState(false);

  // Nuevo: Mantener un estado local para los edits en curso (debounced)
  const [pendingEdits, setPendingEdits] = useState<
    Record<string, Partial<TransactionRecord>>
  >({});

  // Usar useDebouncedSave, pero controlar el estado de guardado real
  const debouncedSave = useDebouncedSave(
    async (records) => {
      setIsActuallySaving(true); // Solo aquí se activa el spinner
      return await onUpdateRecordAction(records);
    },
    () => {
      setIsActuallySaving(false); // Se apaga el spinner solo cuando termina el guardado real
    },
    800 // ms después de dejar de editar
  );

  // Nueva función para aplicar los edits pendientes al dataset principal y disparar el autosave
  const flushPendingEdits = useCallback(() => {
    setData((prevData) => {
      let changed = false;
      const newData = prevData.map((row) => {
        const edits = pendingEdits[row.id];
        if (edits) {
          changed = true;
          return { ...row, ...edits };
        }
        return row;
      });
      if (changed) {
        latestDataRef.current = newData;
        debouncedSave(newData);
      }
      return newData;
    });
    setPendingEdits({});
  }, [pendingEdits, debouncedSave]);

  // useDebouncedCallback para llamar flushPendingEdits después de 600ms sin cambios
  const debouncedFlush = useDebouncedCallback(flushPendingEdits, 600);

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
    progress.start(0.3);
    setIsAddingRow(true);
    try {
      const now = new Date();
      const colombiaDate = new Date(
        now.toLocaleString('en-US', { timeZone: 'America/Bogota' })
      );
      const offset = colombiaDate.getTimezoneOffset();
      colombiaDate.setMinutes(colombiaDate.getMinutes() - offset);

      const newRowId = crypto.randomUUID(); // Generar ID aquí
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
        banco: null,
        banco2: null, // Added missing field
        fechaCliente: null, // Added missing field
        referencia: null,
      };

      const result = await createRecord({ ...newRow, id: newRowId });
      if (result.success) {
        const newRowWithId = { ...newRow, id: newRowId };
        setData((prevData) => [newRowWithId, ...prevData]);
        // Forzar un guardado inmediato del nuevo registro
        await handleSaveOperation([newRowWithId, ...data]);
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
          setData(records);
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
    [onUpdateRecordAction]
  );

  // Update filtered data when date filter changes
  useEffect(() => {
    if (dateFilter.startDate && dateFilter.endDate) {
      const filtered = data.filter((record) => {
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
      setFilteredData(filtered);
      setHasSearchResults(filtered.length > 0);
    } else {
      setFilteredData(data);
      setHasSearchResults(data.length > 0);
    }
  }, [data, dateFilter]);

  // Update DateGroup interface to be a proper tuple type
  interface DateGroup extends Array<string | TransactionRecord[]> {
    0: string;
    1: TransactionRecord[];
    date: string;
    records: TransactionRecord[];
    length: 2;
  }

  // Memoize createDateGroup function
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

  // Update groupedByDate useMemo to include createDateGroup in dependencies
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, TransactionRecord[]>();
    const dataToGroup = [...filteredData];

    dataToGroup.forEach((record) => {
      if (!(record.fecha instanceof Date)) return;
      const dateKey = getDateKey(record.fecha);
      if (!dateKey) return;

      const existingGroup = groups.get(dateKey) ?? [];
      groups.set(dateKey, [...existingGroup, record]);
    });

    // Sort records within each group
    groups.forEach((records, key) => {
      const sortedRecords = records.sort((a, b) => {
        const dateA = toColombiaDate(new Date(b.fecha));
        const dateB = toColombiaDate(new Date(a.fecha));
        return dateA.getTime() - dateB.getTime();
      });
      groups.set(key, sortedRecords);
    });

    // Create final array of DateGroups
    return Array.from(groups.entries())
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, records]) => createDateGroup(date, records));
  }, [filteredData, createDateGroup]);

  // Update paginatedData to handle dates correctly
  const paginatedData = useMemo(() => {
    if (dateFilter.startDate && dateFilter.endDate) {
      return filteredData;
    }

    const currentGroup = groupedByDate[currentPage - 1];
    return currentGroup ? currentGroup.records : [];
  }, [groupedByDate, currentPage, dateFilter, filteredData]);

  // Update current date display when page changes
  useEffect(() => {
    if (dateFilter.startDate && dateFilter.endDate) {
      // Si hay filtro, mostrar rango de fechas
      const start = formatColombiaDate(dateFilter.startDate);
      const end = formatColombiaDate(dateFilter.endDate);
      setCurrentDateDisplay(`${start} - ${end}`);
    } else {
      // Si no hay filtro, mostrar la fecha del grupo actual
      const currentGroup = groupedByDate[currentPage - 1];
      if (currentGroup) {
        const [dateStr] = currentGroup;
        if (dateStr) {
          const date = new Date(`${dateStr}T12:00:00-05:00`);
          if (!isNaN(date.getTime())) {
            const formatted = formatColombiaDate(date);
            setCurrentDateDisplay(formatted);
          }
        }
      }
    }
  }, [currentPage, groupedByDate, dateFilter, setCurrentDateDisplay]);

  // Remove unused paginatedDataAll
  // ...Type-safe input change handler
  const handleInputChange: HandleInputChange = useCallback(
    (id, field, value) => {
      setPendingEdits((prev) => {
        const prevEdits = prev[id] ?? {};
        let newValue = value;
        // Normaliza tipos para campos numéricos
        if (
          [
            'precioNeto',
            'tarifaServicio',
            'impuesto4x1000',
            'gananciaBruta',
            'boletasRegistradas',
            'cilindraje',
          ].includes(field)
        ) {
          newValue =
            typeof value === 'string' ? Number(value) || 0 : (value as number);
        }
        // Si se cambia tipoVehiculo o cilindraje, recalcula precioNeto
        const extra: Partial<TransactionRecord> = {};
        if (
          (field === 'tipoVehiculo' || field === 'cilindraje') &&
          (field === 'tipoVehiculo'
            ? newValue
            : prevEdits.tipoVehiculo ||
              data.find((r) => r.id === id)?.tipoVehiculo)
        ) {
          const tipoVehiculo =
            field === 'tipoVehiculo'
              ? newValue
              : (prevEdits.tipoVehiculo ??
                data.find((r) => r.id === id)?.tipoVehiculo);
          const cilindraje =
            field === 'cilindraje'
              ? newValue
              : (prevEdits.cilindraje ??
                data.find((r) => r.id === id)?.cilindraje);
          const soatPrice = calculateSoatPrice(
            tipoVehiculo as string,
            cilindraje as number | null
          );
          if (soatPrice > 0) {
            extra.precioNeto = soatPrice;
          }
        }
        return {
          ...prev,
          [id]: { ...prevEdits, [field]: newValue, ...extra },
        };
      });
      debouncedFlush();

      // Actualiza la página si cambia la fecha
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
    [data, groupedByDate, debouncedFlush]
  );

  // Limpia debounce al desmontar
  useEffect(() => {
    return () => {
      debouncedFlush.cancel();
    };
  }, [debouncedFlush]);

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
      // Usa el valor editado si existe
      const value =
        pendingEdits[row.id]?.[field] !== undefined
          ? pendingEdits[row.id]?.[field]
          : row[field];
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

      // Calcular el ancho basado en el tipo de campo
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

      // En la sección donde se renderiza el select de emitidoPor:
      if (field === 'emitidoPor') {
        return (
          <select
            value={value as string}
            onChange={(e) => handleInputChange(row.id, field, e.target.value)}
            className={`table-select-base w-[105px] rounded border ${getEmitidoPorClass(String(value ?? ''))}`}
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

      // Modificar la sección del renderInput donde se maneja el campo fecha
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

      // Update all select elements to use the new base class
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

      // Add this before the return statement:
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

      // Inside renderInput function, add these conditions before the final return:
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

      // Dentro de la función renderInput, añade este caso antes del return final:
      if (field === 'banco') {
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => handleInputChange(row.id, field, e.target.value)}
            className="table-select-base w-[120px] rounded border border-gray-600"
            title={value as string}
          >
            <option value="">Seleccionar...</option>
            {bancoOptions.map((option) => (
              <option key={option} value={option} className="text-center">
                {option}
              </option>
            ))}
          </select>
        );
      }

      return (
        <div className={`relative ${isMoneyField ? 'flex items-center' : ''}`}>
          <input
            type={
              field === 'cilindraje'
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
                // Remove non-numeric characters and parse
                newValue = parseNumber(e.target.value);
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
            className={`${
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
          />
        </div>
      );
    },
    [handleInputChange, pendingEdits]
  );

  // Memoize the current date group and related data
  const { currentDateGroup, totalPages } = useMemo(() => {
    const defaultDate = new Date().toISOString().split('T')[0];
    const defaultGroup = createDateGroup(defaultDate, []);

    return {
      currentDateGroup: groupedByDate[currentPage - 1] ?? defaultGroup,
      totalPages: groupedByDate.length,
    };
  }, [groupedByDate, currentPage, createDateGroup]);

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

    setCurrentDateDisplay(formatter.format(date).toUpperCase());
  }, [currentDateGroup]);

  // Add pagination controls component
  const PaginationControls = useCallback(() => {
    if (dateFilter.startDate || dateFilter.endDate) return null;
    return (
      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="rounded px-4 py-2 text-sm font-medium text-black hover:bg-white/10 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="font-display flex items-center px-4 text-sm text-black">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="rounded px-4 py-2 text-sm font-medium text-black hover:bg-white/10 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    );
  }, [currentPage, totalPages, dateFilter]);

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
        setData(data.filter((row) => !rowsToDelete.has(row.id)));
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
        // Configurar las fechas para Colombia (UTC-5)
        const colombiaTimeZone = 'America/Bogota';
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Filtrar los datos usando las fechas en la zona horaria de Colombia
        const filteredData = data.filter((record) => {
          // Convertir la fecha del registro a fecha Colombia
          const recordDate = new Date(record.fecha);
          const colombiaDate = new Date(
            recordDate.toLocaleString('en-US', { timeZone: colombiaTimeZone })
          );

          // Usar las fechas en la zona horaria correcta
          return colombiaDate >= start && colombiaDate <= end;
        });

        if (filteredData.length === 0) {
          alert(
            'No hay datos para exportar en el rango de fechas seleccionado'
          );
          return;
        }

        // Ordenar los datos por fecha
        const sortedData = [...filteredData].sort(
          (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );

        // Transformar los datos aplicando las fórmulas antes de exportar
        const excelData = sortedData.map((record) => {
          const {
            precioNetoAjustado,
            tarifaServicioAjustada,
            impuesto4x1000,
            gananciaBruta,
          } = calculateFormulas(record);

          // Formatear la fecha en la zona horaria de Colombia
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

        // Crear una nueva hoja de trabajo
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Ajustar el ancho de las columnas según los HeaderTitles
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

        // Crear un nuevo libro de trabajo
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registros');

        // Generar el nombre del archivo con fechas en formato Colombia
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
    [data]
  );

  // Memoize the filter callback
  const handleFilterData = useCallback((results: TransactionRecord[]) => {
    setFilteredData(results);
    setHasSearchResults(results.length > 0);
  }, []);

  // Actualizar la función que maneja las fechas
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

  // Actualizar useEffect para el manejo de fechas
  useEffect(() => {
    updateDateDisplay(dateFilter.startDate, dateFilter.endDate);
  }, [dateFilter, currentPage, updateDateDisplay]);

  // Modificar handleDateFilterChange para actualizar la visualización
  const handleDateFilterChange = useCallback(
    (startDate: Date | null, endDate: Date | null) => {
      setDateFilter({ startDate, endDate });
      updateDateDisplay(startDate, endDate);
    },
    [updateDateDisplay]
  );

  // Add proper handler for asesor selection
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

  // Rename TableHeader to _TableHeader since it's unused
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

  // Replace handleToggleAsesorSelection with this optimized version
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

  // Estado para animar el botón de totales
  const [isTotalsButtonLoading, setIsTotalsButtonLoading] = useState(false);

  // Handler para el botón de totales con animación y spinner
  const handleToggleTotals = useCallback(() => {
    setIsTotalsButtonLoading(true);
    setTimeout(() => {
      setShowTotals((prev) => !prev);
      setIsTotalsButtonLoading(false);
    }, 400); // Duración de la animación/spinner
  }, []);

  return (
    <div className="relative">
      <div className="mb-4">
        <div className="flex w-full items-center gap-4">
          {/* Botón Agregar */}
          <button
            onClick={addNewRow}
            disabled={isAddingRow}
            className="group relative flex h-10 w-36 cursor-pointer items-center overflow-hidden rounded-lg border border-green-500 bg-green-500 hover:bg-green-500 active:border-green-500 active:bg-green-500 disabled:opacity-50"
          >
            <span
              className={`ml-8 transform font-semibold text-white transition-all duration-300 ${
                isAddingRow ? 'opacity-0' : 'group-hover:translate-x-20'
              }`}
            >
              Agregar
            </span>
            <span
              className={`absolute right-0 flex h-full items-center justify-center rounded-lg bg-green-500 transition-all duration-300 ${
                isAddingRow
                  ? 'w-full translate-x-0'
                  : 'w-10 group-hover:w-full group-hover:translate-x-0'
              }`}
            >
              {isAddingRow ? (
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
            <button onClick={handleDeleteModeToggle} className="delete-button">
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
            {isDeleteMode && rowsToDelete.size > 0 ? (
              <button
                onClick={handleDeleteSelected}
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Eliminar ({rowsToDelete.size})
              </button>
            ) : null}
          </div>

          {/* Botón Ver Totales / Ver Registros con iconos y spinner y ancho fijo */}
          <button
            onClick={handleToggleTotals}
            disabled={isTotalsButtonLoading}
            className="relative flex h-10 min-w-[170px] items-center justify-center gap-2 rounded-[8px] bg-blue-500 px-4 py-2 font-bold text-white transition-transform duration-300 hover:bg-blue-600"
          >
            <span className="flex w-full items-center justify-center">
              {isTotalsButtonLoading ? (
                <>
                  {/* Spinner2 centrado absoluto sobre el botón */}
                  <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                    <Icons.spinner2 className="h-5 w-5 fill-white" />
                  </span>
                  {/* Espacio reservado para el texto, invisible pero ocupa el mismo ancho */}
                  <span className="invisible flex items-center">
                    {showTotals ? (
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
              ) : showTotals ? (
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
            onClick={() => setIsExportModalOpen(true)}
            className="export-excel-button h-10"
          >
            <svg
              fill="#fff"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 50 50"
            >
              <path d="M28.8125 .03125L.8125 5.34375C.339844 5.433594 0 5.863281 0 6.34375L0 43.65625C0 44.136719 .339844 44.566406 .8125 44.65625L28.8125 49.96875C28.875 49.980469 28.9375 50 29 50C29.230469 50 29.445313 49.929688 29.625 49.78125C29.855469 49.589844 30 49.296875 30 49L30 1C30 .703125 29.855469 .410156 29.625 .21875C29.394531 .0273438 29.105469 -.0234375 28.8125 .03125ZM32 6L32 13L34 13L34 15L32 15L32 20L34 20L34 22L32 22L32 27L34 27L34 29L32 29L32 35L34 35L34 37L32 37L32 44L47 44C48.101563 44 49 43.101563 49 42L49 8C49 6.898438 48.101563 6 47 6ZM36 13L44 13L44 15L36 15ZM6.6875 15.6875L11.8125 15.6875L14.5 21.28125C14.710938 21.722656 14.898438 22.265625 15.0625 22.875L15.09375 22.875C15.199219 22.511719 15.402344 21.941406 15.6875 21.21875L18.65625 15.6875L23.34375 15.6875L17.75 24.9375L23.5 34.375L18.53125 34.375L15.28125 28.28125C15.160156 28.054688 15.035156 27.636719 14.90625 27.03125L14.875 27.03125C14.8125 27.316406 14.664063 27.761719 14.4375 28.34375L11.1875 34.375L6.1875 34.375L12.15625 25.03125ZM36 20L44 20L44 22L36 22ZM36 27L44 27L44 29L36 29ZM36 35L44 35L44 37L36 37Z" />
            </svg>
            Exportar a Excel
          </button>

          {/* Botón Ir al Cuadre - Reposicionado y reestilizado */}
          <button
            onClick={handleNavigateToCuadre}
            disabled={isNavigatingToCuadre}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 active:scale-95 disabled:opacity-50"
          >
            {isNavigatingToCuadre ? (
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

          {/* Auto-save indicator and date */}
          <div className="flex h-10 items-center gap-4">
            {isActuallySaving ? (
              <span className="flex h-10 items-center gap-2 rounded-md bg-blue-300 px-4 py-2 text-sm font-bold text-blue-800">
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
              <span className="flex h-10 items-center rounded-md bg-green-300 px-4 py-2 text-sm font-bold text-green-800">
                ✓ Todos los cambios guardados
              </span>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex h-10 items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="flex h-8 w-8 items-center justify-center rounded bg-gray-600 text-white hover:bg-gray-600"
              title="Reducir zoom"
            >
              -
            </button>
            <span className="w-16 text-center text-sm font-medium text-black">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="flex h-8 w-8 items-center justify-center rounded bg-gray-500 text-white hover:bg-gray-600"
              title="Aumentar zoom"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Modal de exportación por rango de fechas */}
      <ExportDateRangeModal
        isOpen={isExportModalOpen}
        setIsOpen={setIsExportModalOpen}
        onExport={handleExport}
      />

      <SearchControls
        data={data}
        onFilterAction={handleFilterData}
        onDateFilterChangeAction={handleDateFilterChange}
        onToggleAsesorSelectionAction={handleToggleAsesorMode}
        onGenerateCuadreAction={(records) => {
          const selectedRecords = records.filter((r) =>
            selectedAsesores.has(r.id)
          );
          if (selectedRecords.length > 0) {
            localStorage.setItem(
              'cuadreRecords',
              JSON.stringify(selectedRecords)
            );
            router.push('/cuadre', { startPosition: 0.3 });
          }
        }}
        hasSearchResults={hasSearchResults}
        isAsesorSelectionMode={isAsesorSelectionMode}
        hasSelectedAsesores={selectedAsesores.size > 0}
        isLoadingAsesorMode={isLoadingAsesorMode}
      />

      {showTotals ? (
        <TransactionTotals transactions={data} />
      ) : (
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
              transform: `scale(${zoom})`,
              transformOrigin: 'left top',
              width: `${(1 / zoom) * 100}%`,
              height: `${(1 / zoom) * 100}%`,
              overflowX: zoom === 1 ? 'auto' : 'scroll',
              overflowY: 'auto',
            }}
          >
            <table className="w-full text-left text-sm text-gray-600">
              <HeaderTitles isDeleteMode={isDeleteMode} />
              <tbody>
                {paginatedData.map((row, index) => {
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
                      className={`border-b hover:bg-gray-50 ${
                        row.pagado ? getEmitidoPorClass(row.emitidoPor) : ''
                      }`}
                    >
                      {isDeleteMode ? (
                        <td className="table-cell h-full border-r border-gray-600 px-0.5 py-0.5">
                          <div className="flex h-full items-center justify-center">
                            <input
                              type="checkbox"
                              checked={rowsToDelete.has(row.id)}
                              onChange={() => handleDeleteSelect(row.id)}
                              className="h-4 w-4 rounded border-gray-600"
                            />
                          </div>
                        </td>
                      ) : null}
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 0 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'fecha', 'date')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 1 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'tramite')}
                      </td>
                      <td className="table-checkbox-cell whitespace-nowrap">
                        <div className="table-checkbox-wrapper">
                          <label className="check-label">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(row.id)}
                              onChange={() =>
                                handleRowSelect(row.id, row.precioNeto)
                              }
                              disabled={row.pagado}
                              className="sr-only"
                            />
                            <div className="checkmark" />
                          </label>
                        </div>
                      </td>
                      <td className="table-checkbox-cell whitespace-nowrap">
                        <div className="table-checkbox-wrapper">
                          {renderCheckbox(row.id, 'pagado', row.pagado)}
                        </div>
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 4 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(
                          rowWithFormulas,
                          'boletasRegistradas',
                          'number'
                        )}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 5 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'emitidoPor')}
                      </td>
                      <td className="table-cell whitespace-nowrap">
                        {renderInput(rowWithFormulas, 'placa')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 7 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'tipoDocumento')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 8 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'numeroDocumento')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 9 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'nombre')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 10 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'cilindraje', 'number')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 11 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'tipoVehiculo')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 12 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'celular')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 13 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'ciudad')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 14 ? 'border-r-0' : ''
                        }`}
                      >
                        {isAsesorSelectionMode
                          ? renderAsesorSelect(row)
                          : renderInput(rowWithFormulas, 'asesor')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 15 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'novedad')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 16 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(rowWithFormulas, 'precioNeto', 'number')}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 17 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(
                          rowWithFormulas,
                          'tarifaServicio',
                          'number'
                        )}
                      </td>
                      <td className="table-checkbox-cell whitespace-nowrap">
                        <div className="table-checkbox-wrapper">
                          {renderCheckbox(
                            row.id,
                            'comisionExtra',
                            row.comisionExtra
                          )}
                        </div>
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 19 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(
                          rowWithFormulas,
                          'impuesto4x1000',
                          'number'
                        )}
                      </td>
                      <td
                        className={`table-cell whitespace-nowrap ${
                          index === 20 ? 'border-r-0' : ''
                        }`}
                      >
                        {renderInput(
                          rowWithFormulas,
                          'gananciaBruta',
                          'number'
                        )}
                      </td>
                      <td className="table-checkbox-cell whitespace-nowrap">
                        <div className="table-checkbox-wrapper">
                          {renderCheckbox(row.id, 'rappi', row.rappi)}
                        </div>
                      </td>
                      <td className="table-cell whitespace-nowrap">
                        {renderInput(rowWithFormulas, 'observaciones')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!showTotals && !dateFilter.startDate && !dateFilter.endDate && (
        <PaginationControls />
      )}

      {/* Add the payment UI */}
      {selectedRows.size > 0 && (
        <div className="fixed right-4 bottom-4 flex w-[400px] flex-col gap-4 rounded-lg bg-white p-6 shadow-lg">
          <div className="text-center">
            <div className="mb-2 font-semibold">
              Total Seleccionado: ${formatCurrency(totalSelected)}
            </div>
            <div className="flex flex-col gap-2 text-base">
              <div>Boletas: {selectedRows.size}</div>
              <div className="font-mono uppercase">
                Placas: {_selectedPlates.join(', ')}
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
