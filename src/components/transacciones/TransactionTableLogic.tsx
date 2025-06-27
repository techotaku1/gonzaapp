import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useProgress } from '@bprogress/next';
import { useRouter } from '@bprogress/next/app';

import { useDebouncedCallback } from '~/hooks/hook-swr/useDebouncedCallback';
import { useDebouncedSave } from '~/hooks/hook-swr/useDebouncedSave';
import { useTransactionsByDate } from '~/hooks/useTransactionsByDate';
import { toggleAsesorSelectionAction } from '~/server/actions/asesorSelection';
import { createRecord, deleteRecords } from '~/server/actions/tableGeneral';
import { type TransactionRecord } from '~/types';
import { getColombiaDate, getDateKey, toColombiaDate } from '~/utils/dateUtils';
import { calculateSoatPrice } from '~/utils/soatPricing';

import AsesorSelect from './AsesorSelect';

export const tramiteOptions = ['SOAT'] as const;
export const tipoDocumentoOptions = ['CC', 'NIT', 'TI', 'CE', 'PAS'] as const;
export const novedadOptions = [
  'Inicial',
  'Error Pasajero',
  'Renovacion',
  'Indeterminado',
  'Sin Novedad',
  'Cambio de Categoria',
] as const;

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

// Elimina las referencias a EditValues y DateGroup, y define EditValues localmente aquí:
type EditValues = Record<string, Partial<TransactionRecord> & Record<string, unknown>>;

export function useTransactionTableLogic(props: {
  initialData: TransactionRecord[];
  onUpdateRecordAction: (records: TransactionRecord[]) => Promise<SaveResult>;
  showTotals: boolean;
  onToggleTotalsAction: () => void;
  searchTerm?: string;
}) {
  // Desestructura solo lo necesario
  const {
    initialData,
    onUpdateRecordAction,
    onToggleTotalsAction: _onToggleTotalsAction, // unused
    showTotals: _showTotals, // <-- mark as unused
    searchTerm: searchTermProp,
  } = props;

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
  const [searchTerm, setSearchTermAction] = useState<string>(
    searchTermProp ?? ''
  );
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
  // Agrupación por fecha: solo agrupa por la fecha (YYYY-MM-DD) de cada registro, sin mezclar días distintos en la misma página
  const {
    transactions,
    total: _total,
    isLoading: _isLoading,
  } = useTransactionsByDate(getDateKey(new Date()), currentPage, 50);
  const paginatedData = transactions;

  useEffect(() => {
    if (Object.keys(pendingEdits.current).length === 0) {
      setSelectedRows((prevSelected) => {
        const newSelected = new Set(prevSelected);
        props.initialData.forEach((row) => {
          if (newSelected.has(row.id)) {
            const existingRow = props.initialData.find((r) => r.id === row.id);
            if (!existingRow) {
              newSelected.add(row.id);
            }
          }
        });
        return newSelected;
      });
    }
  }, [props.initialData, pendingEdits]);
  const handleSaveSuccess = useCallback(() => {
    setIsActuallySaving(false);
  }, [setIsActuallySaving]);
  const debouncedSave = useDebouncedSave(
    async (records: TransactionRecord[]) => {
      try {
        const result = await props.onUpdateRecordAction(records);
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
  // handleInputChange: depende de initialData, debouncedSave, setIsActuallySaving
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
        setIsActuallySaving(true);
        debouncedSave(
          Object.entries(updated).map(([recordId, edits]) => {
            const baseRecord =
              initialData.find((r) => r.id === recordId) ??
              ({} as TransactionRecord);
            return { ...baseRecord, ...edits } as TransactionRecord;
          })
        );
        return updated;
      });
      // Cambio de página si cambia la fecha (ya no hay groupedByDate, así que omite esta lógica)
    },
    [initialData, debouncedSave, setIsActuallySaving]
  );
  const handleRowSelect = (id: string, _precioNeto: number) => {
    const newSelected = new Set(selectedRows);
    const record = props.initialData.find((r) => r.id === id);
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
      const record = props.initialData.find((r) => r.id === id);
      return sum + (record?.precioNeto ?? 0);
    }, 0);
    setTotalSelected(total);
  }, [selectedRows, props.initialData]);
  const handlePay = async () => {
    const updatedData = props.initialData.map((record) => {
      if (selectedRows.has(record.id)) {
        return {
          ...record,
          pagado: true,
          boletasRegistradas: totalSelected,
        };
      }
      return record;
    });
    await props.onUpdateRecordAction(updatedData);
    setSelectedRows(new Set());
  };
  // Cuando agregas un nuevo registro, asegúrate de que la fecha sea la de hoy (Colombia) y que la paginación lo lleve a la página correcta
  const addNewRow = async () => {
    progress.start(0.3);
    setIsAddingRow(true);
    try {
      // Obtener la fecha y hora actual y restar 5 horas manualmente para Colombia
      const now = new Date();
      now.setHours(now.getHours() - 5);
      const fechaColombia = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      );

      const newRowId = crypto.randomUUID();
      const newRow: Omit<TransactionRecord, 'id'> = {
        fecha: fechaColombia,
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
        setCurrentPage(1); // Siempre vuelve a la primera página del día actual
        await handleSaveOperation([
          { ...newRow, id: newRowId },
          ...props.initialData,
        ]);
      } else {
        console.error('Error creating new record:', result.error);
      }
    } finally {
      setIsAddingRow(false);
      progress.stop();
    }
  };
  // handleSaveOperation: solo depende de onUpdateRecordAction
  const handleSaveOperation = useCallback(
    async (records: TransactionRecord[]): Promise<SaveResult> => {
      try {
        const result = await onUpdateRecordAction(records);
        if (result.success) {
          setSelectedRows((prevSelected) => {
            const newSelected = new Set(prevSelected);
            records.forEach((record) => {
              if (newSelected.has(record.id)) {
                // Usar initialData del closure, no como dependencia
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
    [initialData, onUpdateRecordAction]
  );
  // Cambia filteredData para que NO dependa de editValues ni de ningún estado de edición
  const filteredData = useMemo(() => {
    // Solo filtra por fecha o búsqueda, nunca por edición
    if (dateFilter.startDate && dateFilter.endDate) {
      const filtered = props.initialData.filter((record) => {
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
      const filtered = props.initialData.filter((item) =>
        Object.entries(item).some(([key, value]) => {
          if (key === 'fecha' || value === null) return false;
          return String(value).toLowerCase().includes(search);
        })
      );
      setHasSearchResults(filtered.length > 0);
      return filtered;
    } else {
      setHasSearchResults(props.initialData.length > 0);
      return props.initialData;
    }
  }, [props.initialData, dateFilter, debouncedSearchTerm]);
  // paginatedData: nunca debe depender de editValues ni de ningún estado de edición
  const paginatedDataFinal: TransactionRecord[] = useMemo(() => {
    const edits = editValues;
    let baseData: TransactionRecord[] = [];

    if (debouncedSearchTerm || (dateFilter.startDate && dateFilter.endDate)) {
      baseData = filteredData;
    } else {
      baseData = paginatedData;
    }

    return baseData.map((row) =>
      edits[row.id] ? { ...row, ...edits[row.id] } : row
    );
  }, [
    paginatedData,
    dateFilter,
    filteredData,
    debouncedSearchTerm,
    editValues,
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
  // handleExport: solo depende de initialData
  const handleExport = useCallback(
    (_startDate: Date, _endDate: Date) => {
      // ...existing code for export (igual que antes, sin cambios)...
    },
    [] // Removed initialData from dependencies
  );
  // handleToggleAsesorMode: sin dependencias externas
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
  // handleAsesorSelection: sin dependencias externas
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
          {/* Mostrar el select de asesor junto al checkbox */}
          <div className="min-w-[120px] flex-1">
            <AsesorSelect
              value={row.asesor ?? ''}
              onChange={(newValue: string) =>
                handleInputChange(row.id, 'asesor', newValue)
              }
            />
          </div>
        </div>
      );
    },
    [
      isAsesorSelectionMode,
      selectedAsesores,
      handleAsesorSelection,
      handleInputChange,
    ]
  );
  // handleFilterData: sin dependencias externas
  const handleFilterData = useCallback(
    (results: TransactionRecord[], searchValue?: string) => {
      setHasSearchResults(results.length > 0);
      if (typeof searchValue === 'string') {
        setSearchTermAction(searchValue);
      }
    },
    []
  );
  // updateDateDisplay: tipa los parámetros correctamente
  const updateDateDisplay = useCallback(
    (start: Date | null, end: Date | null) => {
      const startStr =
        start &&
        toColombiaDate(start).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });
      const endStr =
        end &&
        toColombiaDate(end).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });
      if (startStr && endStr) {
        setCurrentDateDisplay(`${startStr} - ${endStr}`);
      } else if (startStr) {
        setCurrentDateDisplay(`${startStr} - Actual`);
      } else {
        // Mostrar la fecha actual si no hay filtro
        if (paginatedData.length > 0 && paginatedData[0].fecha) {
          const date =
            paginatedData[0].fecha instanceof Date
              ? paginatedData[0].fecha
              : new Date(paginatedData[0].fecha);
          setCurrentDateDisplay(
            date
              .toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'America/Bogota',
              })
              .toUpperCase()
          );
        } else {
          setCurrentDateDisplay('Todas las fechas');
        }
      }
    },
    [setCurrentDateDisplay, paginatedData]
  );

  useEffect(() => {
    updateDateDisplay(dateFilter.startDate, dateFilter.endDate);
  }, [dateFilter, currentPage, updateDateDisplay]);
  // handleDateFilterChange: tipa los parámetros correctamente
  const handleDateFilterChange = useCallback(
    (_start: Date | null, _end: Date | null) => {
      setDateFilter({ startDate: _start, endDate: _end });
      updateDateDisplay(_start, _end);
    },
    [updateDateDisplay]
  );
  const [isTotalsButtonLoading, setIsTotalsButtonLoading] = useState(false);
  const handleToggleTotals = useCallback(() => {
    setIsTotalsButtonLoading(true);
    setTimeout(() => {
      // Usar la prop desestructurada directamente
      _onToggleTotalsAction();
      setIsTotalsButtonLoading(false);
    }, 400);
  }, [_onToggleTotalsAction]);
  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm, debouncedSetSearchTerm]);
  // handleNavigateToCuadre: asegúrate de que esté definido antes de retornarlo
  const handleNavigateToCuadre = useCallback(() => {
    setIsNavigatingToCuadre(true);
    setZoom(0.5);
    setTimeout(() => {
      router.push('/cuadre', { startPosition: 0.3 });
    }, 500);
  }, [router]);
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
    paginatedData: paginatedDataFinal,
    initialData: props.initialData,
    onUpdateRecordAction: props.onUpdateRecordAction,
    showTotals: props.showTotals,
    onToggleTotalsAction: props.onToggleTotalsAction,
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
    handleToggleAsesorMode,
    handleNavigateToCuadre,
    handleToggleTotals,
    isTotalsButtonLoading,
    formatCurrency,
    parseNumber,
    addNewRow,
    handlePay,
    handleZoomOut,
    handleZoomIn,
  };
}
