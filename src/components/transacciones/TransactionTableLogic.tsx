import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useProgress } from '@bprogress/next';
import { useRouter } from '@bprogress/next/app';
import * as XLSX from 'xlsx';

import { useDebouncedCallback } from '~/hooks/useDebouncedCallback';
import { useDebouncedSave } from '~/hooks/useDebouncedSave';
import { useTransactionsByDate } from '~/hooks/useTransactionsByDate';
import { toggleAsesorSelectionAction } from '~/server/actions/asesorSelection';
import { createRecord, deleteRecords } from '~/server/actions/tableGeneral';
import { type TransactionRecord } from '~/types';
import { getColombiaDate, getDateKey, toColombiaDate } from '~/utils/dateUtils';
import { calculateFormulas } from '~/utils/formulas';
import { calculateSoatPrice } from '~/utils/soatPricing';

import { AsesorSelect } from './AsesorSelect';

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
type EditValues = Record<
  string,
  Partial<TransactionRecord> & Record<string, unknown>
>;

export function useTransactionTableLogic(props: {
  initialData: TransactionRecord[];
  onUpdateRecordAction: (records: TransactionRecord[]) => Promise<SaveResult>;
  showTotals: boolean;
  onToggleTotalsAction: () => void;
  searchTerm?: string;
  asesores?: string[];
  onAddAsesorAction?: (nombre: string) => Promise<void>;
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
  // Estado para mostrar la fecha actual en la UI
  const [currentDateDisplay, setCurrentDateDisplay] = useState('');
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
  // Obtén la fecha seleccionada (o la de hoy si no hay filtro)
  const selectedDate = useMemo(() => {
    if (dateFilter.startDate) return getDateKey(dateFilter.startDate);
    return getDateKey(new Date());
  }, [dateFilter.startDate]);

  // --- CORRECCIÓN DE PAGINACIÓN POR FECHA ---
  // Cuando el usuario cambia de página, debe cambiar la fecha seleccionada al día anterior/siguiente.
  // Agrega helpers para avanzar/retroceder días.
  const goToPreviousDay = useCallback(() => {
    const current = dateFilter.startDate
      ? new Date(dateFilter.startDate)
      : new Date();
    current.setDate(current.getDate() - 1);
    setDateFilter({ startDate: current, endDate: null });
    setCurrentPage(1);
  }, [dateFilter.startDate]);

  const goToNextDay = useCallback(() => {
    const current = dateFilter.startDate
      ? new Date(dateFilter.startDate)
      : new Date();
    current.setDate(current.getDate() + 1);
    setDateFilter({ startDate: current, endDate: null });
    setCurrentPage(1);
  }, [dateFilter.startDate]);

  // Hook para obtener los datos paginados del backend
  const {
    transactions: paginatedData,
    total: totalRecords,
    isLoading: _isLoadingPage, // prefijo _ para evitar warning de unused var
  } = useTransactionsByDate(selectedDate, currentPage, 50);

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
  const editValuesRef = useRef<EditValues>({});
  const editTimeoutRef = useRef<Record<string, NodeJS.Timeout | null>>({});
  // Nuevo: para evitar limpiar edits si el usuario editó hace poco
  const lastEditTimestampRef = useRef<number>(0);

  // handleInputChange: depende de initialData, debouncedSave, setIsActuallySaving
  const handleInputChange: HandleInputChange = useCallback(
    (id, field, value) => {
      setEditValues((prev: EditValues) => {
        const prevEdits = prev[id] ?? {};
        let newValue = value;

        // --- CORREGIDO: Para el campo 'fecha', convierte el Date local editado a UTC con los componentes de la hora de Colombia ---
        if (field === 'fecha' && value instanceof Date) {
          // value es la fecha local seleccionada por el usuario (en la zona del navegador)
          // Queremos guardar la hora de Colombia como UTC real
          // 1. Tomar los componentes de la fecha local seleccionada
          // 2. Crear un Date UTC con esos componentes
          newValue = new Date(
            Date.UTC(
              value.getFullYear(),
              value.getMonth(),
              value.getDate(),
              value.getHours(),
              value.getMinutes(),
              value.getSeconds(),
              value.getMilliseconds()
            )
          );
        }

        // --- Limpia valores vacíos para campos que aceptan null ---
        if (
          (field === 'novedad' ||
            field === 'observaciones' ||
            field === 'tipoVehiculo' ||
            field === 'celular' ||
            field === 'cilindraje') &&
          (value === '' || value === undefined)
        ) {
          newValue = null;
        }
        // Para campos string NOT NULL, pon string vacío si es null/undefined
        const notNullStringFields = [
          'tramite',
          'emitidoPor',
          'placa',
          'tipoDocumento',
          'numeroDocumento',
          'nombre',
          'ciudad',
          'asesor',
        ];
        if (notNullStringFields.includes(field)) {
          // Preferir nullish coalescing assignment
          newValue ??= '';
        }
        // ...existing code for numeric fields...
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
        // --- SIEMPRE actualiza la ref para que la UI use los edits más recientes ---
        editValuesRef.current = updated;
        debouncedSave(
          Object.entries(updated).map(([recordId, edits]) => {
            const baseRecord =
              initialData.find((r) => r.id === recordId) ??
              ({} as TransactionRecord);
            return { ...baseRecord, ...edits } as TransactionRecord;
          })
        );
        // --- SOLO muta la fila editada y la página actual ---
        // Si usas SWR, puedes mutar la clave de la página actual aquí
        if (typeof window !== 'undefined') {
          import('swr').then(({ mutate }) => {
            // Mutar solo la clave de la página actual (por fecha)
            const dateKey =
              initialData.find((r) => r.id === id)?.fecha instanceof Date
                ? initialData
                    .find((r) => r.id === id)!
                    .fecha.toISOString()
                    .slice(0, 10)
                : undefined;
            if (dateKey) {
              mutate(`/api/transactions?date=${dateKey}&limit=50&offset=0`);
            }
          });
        }
        return updated;
      });
      // ...existing code...
    },
    [initialData, debouncedSave, setIsActuallySaving]
  );
  const handleRowSelect = (id: string, _precioNeto: number) => {
    const newSelected = new Set(selectedRows);
    // CORREGIDO: Buscar en initialData (todos los registros) en lugar de solo la página actual
    const record = props.initialData.find((r) => r.id === id);

    if (newSelected.has(id)) {
      newSelected.delete(id);
      setSelectedPlates((prev) => prev.filter((p) => p !== record?.placa));
    } else {
      // CORREGIDO: Permitir selección si no está pagado (sin importar si boleta es true o false)
      if (record && !record.pagado) {
        newSelected.add(id);
        if (record?.placa) {
          setSelectedPlates((prev) => [...prev, record.placa.toUpperCase()]);
        }
      }
    }
    setSelectedRows(newSelected);
  };

  // CORREGIDO: Calcular total seleccionado de todos los registros seleccionados (sin filtrar por boleta)
  useEffect(() => {
    const total = Array.from(selectedRows).reduce((sum, id) => {
      const record = props.initialData.find((r) => r.id === id);
      return sum + (record && !record.pagado ? (record?.precioNeto ?? 0) : 0);
    }, 0);
    setTotalSelected(total);
  }, [selectedRows, props.initialData]);
  // Cuando agregas un nuevo registro, asegúrate de que la fecha sea la de hoy (Colombia) y que la paginación lo lleve a la página correcta
  const addNewRow = async () => {
    progress.start(0.3);
    setIsAddingRow(true);
    try {
      // --- Crea la fecha UTC correspondiente a la hora actual de Colombia ---
      const now = new Date();
      // Obtiene la hora actual en Colombia
      const colombiaNow = toColombiaDate(now);
      // Crea un Date UTC con los componentes de la hora de Colombia
      const fechaColombia = new Date(
        Date.UTC(
          colombiaNow.getFullYear(),
          colombiaNow.getMonth(),
          colombiaNow.getDate(),
          colombiaNow.getHours(),
          colombiaNow.getMinutes(),
          colombiaNow.getSeconds(),
          colombiaNow.getMilliseconds()
        )
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
        if (typeof window !== 'undefined') {
          const { mutate } = await import('swr');
          const dateKey = getDateKey(fechaColombia);

          // Mutate optimista: agrega la fila localmente al instante
          mutate(
            `/api/transactions?date=${dateKey}&limit=50&offset=0`,
            (
              current: { data: TransactionRecord[]; total: number } | undefined
            ) => {
              const newData = current?.data
                ? [{ ...newRow, id: newRowId }, ...current.data]
                : [{ ...newRow, id: newRowId }];
              return {
                data: newData,
                total:
                  typeof current?.total === 'number' ? current.total + 1 : 1,
              };
            },
            false // No revalidar aún
          );

          // --- ESPERA LA REVALIDACIÓN ANTES DE DETENER LA BARRA ---
          await mutate(
            `/api/transactions?date=${dateKey}&limit=50&offset=0`,
            undefined,
            { revalidate: true }
          );
          await mutate('transactions', undefined, { revalidate: true });

          // --- SOLO DETÉN LA BARRA CUANDO SWR YA REVALIDÓ Y LA FILA ESTÁ EN initialData ---
          // Espera hasta que la nueva fila esté en initialData (máx 2 segundos)
          let attempts = 0;
          while (!initialData.some((r) => r.id === newRowId) && attempts < 20) {
            await new Promise((res) => setTimeout(res, 100));
            attempts++;
          }
        }
        setDateFilter({ startDate: new Date(), endDate: null });
        setCurrentPage(1);
      } else {
        console.error('Error creating new record:', result.error);
      }
    } finally {
      setIsAddingRow(false);
      if (typeof progress.stop === 'function') {
        progress.stop();
      }
    }
  };
  // handleSaveOperation: solo depende de onUpdateRecordAction
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          // CORREGIDO: Usar las funciones de utilidad para manejo correcto
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
    // --- SIEMPRE prioriza los edits locales sobre los datos remotos ---
    // Usa la referencia para evitar parpadeos incluso si SWR revalida
    const edits = editValuesRef.current;
    let baseData: TransactionRecord[] = [];

    if (debouncedSearchTerm || (dateFilter.startDate && dateFilter.endDate)) {
      baseData = filteredData;
    } else {
      baseData = paginatedData;
    }

    // Aplica los edits locales sobre los datos remotos, pero nunca los sobrescribas hasta que el backend confirme
    return baseData.map((row) =>
      edits[row.id]
        ? {
            ...row,
            ...Object.fromEntries(
              Object.entries(edits[row.id]).map(([k, v]) => [k, v])
            ),
          }
        : row
    );
  }, [
    paginatedData,
    dateFilter,
    filteredData,
    debouncedSearchTerm,
    // NO dependas de editValues aquí, solo de la ref
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
  // --- Exportar a Excel usando XLSX ---
  const handleExport = (startDate: Date, endDate: Date) => {
    try {
      const colombiaTimeZone = 'America/Bogota';
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Filtrar los datos usando las fechas en la zona horaria de Colombia
      const filteredData = props.initialData.filter((record) => {
        const recordDate = new Date(record.fecha);
        const colombiaDate = new Date(
          recordDate.toLocaleString('en-US', { timeZone: colombiaTimeZone })
        );
        return colombiaDate >= start && colombiaDate <= end;
      });

      if (filteredData.length === 0) {
        alert('No hay datos para exportar en el rango de fechas seleccionado');
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
      ws['!cols'] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 8 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 12 },
        { wch: 15 },
        { wch: 30 },
        { wch: 10 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 8 },
        { wch: 40 },
      ];
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
      alert('Error al exportar los datos');
    }
  };

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
  // Elimina emptyAsync (no se usa)
  // const emptyAsync = () => {
  //   throw new Error('onAddAsesorAction no implementado');
  // };

  // Desestructura onAddAsesorAction fuera del useCallback para evitar warning de dependencias
  const { onAddAsesorAction } = props;

  // Permite seleccionar automáticamente el asesor recién creado y guardar el cambio
  const handleAddAndSelectAsesor = useCallback(
    async (rowId: string, nombre: string) => {
      if (onAddAsesorAction) {
        await onAddAsesorAction(nombre);
        // Selecciona el asesor recién creado y dispara guardado inmediato
        handleInputChange(rowId, 'asesor', nombre);
      }
    },
    [onAddAsesorAction, handleInputChange]
  );
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
              asesores={props.asesores ?? []}
              // Usa la función que selecciona y guarda el asesor nuevo
              onAddAsesorAction={async (nombre: string) =>
                handleAddAndSelectAsesor(row.id, nombre)
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
      props.asesores,
      handleAddAndSelectAsesor,
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
    [paginatedData]
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
  // --- NUEVO: Mover automáticamente al día anterior si no hay registros ---
  useEffect(() => {
    // Solo si no está cargando, no está buscando, y no está agregando
    if (
      !isAddingRow &&
      !isActuallySaving &&
      !debouncedSearchTerm &&
      paginatedData.length === 0 &&
      dateFilter.startDate
    ) {
      // Busca el día anterior con registros
      const prevDay = new Date(dateFilter.startDate);
      prevDay.setDate(prevDay.getDate() - 1);
      setDateFilter({ startDate: prevDay, endDate: null });
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paginatedData.length,
    isAddingRow,
    isActuallySaving,
    debouncedSearchTerm,
  ]);

  // --- NUEVO: Limpia editValues SOLO si los datos remotos reflejan los edits Y no hay edits pendientes ---
  // Añade un timeout para limpiar los edits después de un pequeño delay para evitar parpadeo
  const clearEditsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const hasEdits = Object.keys(editValues).length > 0;
    const hasActiveTimeouts = Object.values(editTimeoutRef.current ?? {}).some(
      Boolean
    );

    if (hasEdits && !hasActiveTimeouts) {
      const allEditsAreInRemote = Object.entries(editValues).every(
        ([id, edits]) => {
          const remote = props.initialData.find((r) => r.id === id);
          if (!remote) return false;
          return Object.entries(edits).every(([field, value]) => {
            // --- Permite comparar null y string vacío como equivalentes para campos que aceptan ambos ---
            const remoteVal = remote[field as keyof typeof remote];
            if (
              (value === null || value === '') &&
              (remoteVal === null || remoteVal === '')
            ) {
              return true;
            }
            return JSON.stringify(remoteVal) === JSON.stringify(value);
          });
        }
      );
      if (allEditsAreInRemote) {
        if (clearEditsTimeoutRef.current) {
          clearTimeout(clearEditsTimeoutRef.current);
        }
        const lastEdit = lastEditTimestampRef.current;
        clearEditsTimeoutRef.current = setTimeout(() => {
          if (lastEdit === lastEditTimestampRef.current) {
            setEditValues({});
            editValuesRef.current = {};
            setIsActuallySaving(false);
          }
        }, 150);
      } else {
        if (clearEditsTimeoutRef.current) {
          clearTimeout(clearEditsTimeoutRef.current);
          clearEditsTimeoutRef.current = null;
        }
      }
    } else {
      if (clearEditsTimeoutRef.current) {
        clearTimeout(clearEditsTimeoutRef.current);
        clearEditsTimeoutRef.current = null;
      }
    }
  }, [props.initialData, editValues]);

  // --- NUEVO: Si al cargar la página por primera vez no hay registros en el día actual, navega automáticamente al día anterior con registros ---
  useEffect(() => {
    // Solo ejecuta en el primer render y cuando no hay registros en el día actual
    if (
      !isAddingRow &&
      !isActuallySaving &&
      !debouncedSearchTerm &&
      paginatedData.length === 0 &&
      (dateFilter.startDate === null ||
        (dateFilter.startDate &&
          !props.initialData.some((r) => {
            const d =
              r.fecha instanceof Date
                ? r.fecha.toISOString().slice(0, 10)
                : new Date(r.fecha).toISOString().slice(0, 10);
            return d === getDateKey(dateFilter.startDate!);
          }))) &&
      props.initialData.length > 0
    ) {
      // Busca el día más reciente con registros (el más grande)
      const allDates = Array.from(
        new Set(
          props.initialData.map((r) =>
            r.fecha instanceof Date
              ? r.fecha.toISOString().slice(0, 10)
              : new Date(r.fecha).toISOString().slice(0, 10)
          )
        )
      ).sort();
      const lastDate = allDates[allDates.length - 1];
      if (lastDate) {
        const [y, m, d] = lastDate.split('-').map(Number);
        setDateFilter({ startDate: new Date(y, m - 1, d), endDate: null });
        setCurrentPage(1);
      }
    }
  }, [
    paginatedData.length,
    isAddingRow,
    isActuallySaving,
    debouncedSearchTerm,
    dateFilter.startDate,
    props.initialData,
  ]);

  // --- ARREGLO: Si no hay registros en la página actual, y tampoco hay registros en initialData para ese día, NO mostrar "Cargando registros..." infinito ---
  // Esto se maneja en el componente TransactionTable, pero aquí puedes exponer una bandera:
  const isTrulyLoadingPage =
    paginatedData.length === 0 &&
    !isAddingRow &&
    !isActuallySaving &&
    !debouncedSearchTerm &&
    !!dateFilter.startDate &&
    props.initialData.some((r) => {
      const d =
        r.fecha instanceof Date
          ? r.fecha.toISOString().slice(0, 10)
          : new Date(r.fecha).toISOString().slice(0, 10);
      return d === getDateKey(dateFilter.startDate!);
    });

  // --- NUEVO: handler para check pagado instantáneo ---
  const handlePagadoCheckbox = async (
    row: TransactionRecord,
    checked: boolean
  ) => {
    // No uses setState aquí, solo expón la función para el componente
    await props.onUpdateRecordAction([{ ...row, pagado: checked }]);
  };

  // --- NUEVO: Limpia la selección de boletas pagadas automáticamente ---
  useEffect(() => {
    // Si algún registro seleccionado ya está pagado, quítalo de la selección
    const toRemove = Array.from(selectedRows).filter((id) => {
      const row = props.initialData.find((r) => r.id === id);
      return row && row.pagado === true;
    });
    if (toRemove.length > 0) {
      const newSelected = new Set(selectedRows);
      toRemove.forEach((id) => newSelected.delete(id));
      if (newSelected.size !== selectedRows.size) {
        setSelectedRows(newSelected);
      }
    }
  }, [selectedRows, props.initialData, setSelectedRows]);

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
    currentDateDisplay, // <-- corregido aquí
    setCurrentDateDisplay, // <-- corregido aquí
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
    totalRecords,
    selectedDate,
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
    handleZoomOut,
    handleZoomIn,
    goToPreviousDay,
    goToNextDay,
    isTrulyLoadingPage,
    handlePagadoCheckbox,
  };
}
