'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import * as XLSX from 'xlsx';

import { useDebouncedSave } from '~/hooks/useDebouncedSave';
import { createRecord, deleteRecords } from '~/server/actions/tableGeneral';
import { type TransactionRecord } from '~/types';
import { calculateFormulas } from '~/utils/formulas';
import '~/styles/spinner.css';
import '~/styles/buttonLoader.css';
import '~/styles/deleteButton.css';

import ExportDateRangeModal from './ExportDateRangeModal';
import HeaderTitles from './HeaderTitles';

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

// Add this function at the component level, before the TransactionTable function
const getEmitidoPorClass = (value: string): string => {
  if (value.includes('Panel Juan')) return 'emitido-por-panel-juan';
  if (value.includes('Panel Evelio')) return 'emitido-por-panel-evelio';
  if (value.includes('Panel William')) return 'emitido-por-panel-william'; // Nueva condición
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
  'Panel William', // Nueva opción añadida
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

export default function TransactionTable({
  initialData,
  onUpdateRecordAction,
}: {
  initialData: TransactionRecord[];
  onUpdateRecordAction: (records: TransactionRecord[]) => Promise<SaveResult>;
}): React.JSX.Element {
  const [data, setData] = useState<TransactionRecord[]>(initialData);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [totalSelected, setTotalSelected] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDate, setCurrentDate] = useState(getCurrentDate());
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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

  // Move groupedByDate before it's used
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, TransactionRecord[]>();

    data.forEach((record) => {
      if (!(record.fecha instanceof Date) || isNaN(record.fecha.getTime())) {
        return;
      }

      const date = new Date(record.fecha);
      const dateKey = date.toISOString().split('T')[0] ?? '';
      if (!dateKey) return;

      const existingGroup = groups.get(dateKey) ?? [];
      groups.set(dateKey, [...existingGroup, record]);
    });

    // Ordenar registros dentro de cada grupo por hora
    for (const [key, records] of groups.entries()) {
      const sortedRecords = records.sort((a, b) => {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });
      groups.set(key, sortedRecords);
    }

    // Ordenar grupos por fecha
    return Array.from(groups.entries()).sort(([dateA], [dateB]) =>
      dateB.localeCompare(dateA)
    );
  }, [data]);

  // Type-safe input change handler
  const handleInputChange: HandleInputChange = useCallback(
    (id, field, value) => {
      setData((prevData) => {
        const newData = prevData.map((row) => {
          if (row.id === id) {
            const updatedRow = { ...row };
            let newDate: Date;

            switch (field) {
              case 'fecha':
                if (value instanceof Date) {
                  newDate = value;
                } else {
                  newDate = new Date(value as string);
                }
                if (!isNaN(newDate.getTime())) {
                  updatedRow[field] = newDate;
                }
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

      // Cuando se cambia la fecha, actualizar la página actual
      if (field === 'fecha' && value) {
        const dateStr = (
          value instanceof Date ? value : new Date(value as string)
        )
          .toISOString()
          .split('T')[0];
        // Encontrar la página correspondiente a la nueva fecha
        const pageIndex = groupedByDate.findIndex(
          ([gDate]) => gDate === dateStr
        );
        if (pageIndex !== -1) {
          setCurrentPage(pageIndex + 1);
        }
      }
    },
    [debouncedSave, groupedByDate]
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
            return 'w-[100px]'; // Reducido de 100px
          case 'tipoDocumento':
            return 'w-[40px]';
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
            className={`emitido-por-select w-[105px] overflow-hidden rounded border text-ellipsis ${getEmitidoPorClass(value as string)}`}
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
                  const inputDate = new Date(e.target.value + ':00Z');
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
            className="placa-field w-[80px] cursor-pointer overflow-hidden rounded border hover:overflow-visible hover:text-clip"
          />
        </div>
      );

      if (field === ('placa' as keyof TransactionRecord)) {
        return renderPlacaInput();
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
                ? 'h-3 w-3 rounded border-gray-300'
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
    [handleInputChange]
  );

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
        className="rounded px-4 py-2 text-sm font-medium text-black hover:bg-white/10 disabled:opacity-50"
      >
        Anterior
      </button>
      <span className="flex items-center px-4 text-sm text-black">
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
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={(e) => handleInputChange(id, field, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 disabled:opacity-50"
      />
    ),
    [handleInputChange]
  );

  const handleExport = useCallback(
    (startDate: Date, endDate: Date) => {
      try {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredData = data.filter((record) => {
          const recordDate = new Date(record.fecha);
          return recordDate >= start && recordDate <= end;
        });

        if (filteredData.length === 0) {
          alert(
            'No hay datos para exportar en el rango de fechas seleccionado'
          );
          return;
        }

        // Transformar los datos aplicando las fórmulas antes de exportar
        const excelData = filteredData.map((record) => {
          // Calcular las fórmulas para cada registro
          const {
            precioNetoAjustado,
            tarifaServicioAjustada,
            impuesto4x1000,
            gananciaBruta,
          } = calculateFormulas(record);

          return {
            Fecha: new Date(record.fecha).toLocaleString('es-CO'),
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
            'Precio Neto': precioNetoAjustado, // Usar valor ajustado
            'Comisión Extra': record.comisionExtra ? 'Sí' : 'No',
            'Tarifa Servicio': tarifaServicioAjustada, // Usar valor ajustado
            '4x1000': impuesto4x1000, // Usar valor calculado
            'Ganancia Bruta': gananciaBruta, // Usar valor calculado
            'Comisión Rappi': record.rappi
              ? `${record.precioNeto * 0.01}`
              : '0',
            Rappi: record.rappi ? 'Sí' : 'No',
            Observaciones: record.observaciones,
          };
        });

        // Crear una nueva hoja de trabajo
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Ajustar el ancho de las columnas
        const colWidths = [
          { wch: 20 }, // Fecha
          { wch: 10 }, // Trámite
          { wch: 8 }, // Pagado
          { wch: 10 }, // Boletas Registradas
          { wch: 15 }, // Emitido Por
          { wch: 10 }, // Placa
          { wch: 8 }, // Tipo Documento
          { wch: 15 }, // Número Documento
          { wch: 30 }, // Nombre
          { wch: 10 }, // Cilindraje
          { wch: 15 }, // Tipo Vehículo
          { wch: 12 }, // Celular
          { wch: 15 }, // Ciudad
          { wch: 20 }, // Asesor
          { wch: 30 }, // Novedad
          { wch: 12 }, // Precio Neto
          { wch: 12 }, // Comisión Extra
          { wch: 12 }, // Tarifa Servicio
          { wch: 10 }, // 4x1000
          { wch: 12 }, // Ganancia Bruta
          { wch: 8 }, // Rappi
          { wch: 50 }, // Observaciones
        ];

        ws['!cols'] = colWidths;

        // Crear un nuevo libro de trabajo
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registros');

        // Generar el archivo Excel
        const fileName = `registros_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
      } catch (error) {
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

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={addNewRow}
            className="group relative flex h-10 w-36 cursor-pointer items-center overflow-hidden rounded-lg border border-green-500 bg-green-500 hover:bg-green-500 active:border-green-500 active:bg-green-500"
          >
            <span className="ml-8 transform font-semibold text-white transition-all duration-300 group-hover:translate-x-20 group-hover:opacity-0">
              Agregar
            </span>
            <span className="absolute right-0 flex h-full w-10 transform items-center justify-center rounded-lg bg-green-500 transition-all duration-300 group-hover:w-full group-hover:translate-x-0">
              <svg
                className="w-8 text-white group-active:scale-[0.8]" // Cambiado de active:scale-[0.8] a group-active:scale-[0.8]
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
            </span>
          </button>

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

            {isDeleteMode && rowsToDelete.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Eliminar ({rowsToDelete.size})
              </button>
            )}
          </div>

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
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Exportar a Excel
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
                title="Reducir zoom"
              >
                -
              </button>
              <span className="text-sm text-black">
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
        </div>
        <time className="font-display text-2xl font-bold text-black">
          {currentDate}
        </time>
      </div>

      {/* Modal de exportación por rango de fechas */}
      <ExportDateRangeModal
        isOpen={isExportModalOpen}
        setIsOpen={setIsExportModalOpen}
        onExport={handleExport}
      />

      {/* Modificar la sección de la tabla */}
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
          <table className="w-full text-left text-sm text-gray-500">
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
                    {isDeleteMode && (
                      <td className="table-cell h-full border-r border-gray-400 px-0.5 py-0.5">
                        <div className="flex h-full items-center justify-center">
                          <input
                            type="checkbox"
                            checked={rowsToDelete.has(row.id)}
                            onChange={() => handleDeleteSelect(row.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </div>
                      </td>
                    )}
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
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row.id)}
                          onChange={() =>
                            handleRowSelect(row.id, row.precioNeto)
                          }
                          disabled={row.pagado}
                          className="h-4 w-4 rounded border-gray-400 disabled:opacity-50"
                        />
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
                      {renderInput(rowWithFormulas, 'asesor')}
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
                      {renderInput(rowWithFormulas, 'tarifaServicio', 'number')}
                    </td>
                    <td className="table-checkbox-cell whitespace-nowrap">
                      <div className="table-checkbox-wrapper">
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
                      </div>
                    </td>
                    <td
                      className={`table-cell whitespace-nowrap ${
                        index === 19 ? 'border-r-0' : ''
                      }`}
                    >
                      {renderInput(rowWithFormulas, 'impuesto4x1000', 'number')}
                    </td>
                    <td
                      className={`table-cell whitespace-nowrap ${
                        index === 20 ? 'border-r-0' : ''
                      }`}
                    >
                      {renderInput(rowWithFormulas, 'gananciaBruta', 'number')}
                    </td>
                    <td className="table-checkbox-cell whitespace-nowrap">
                      <div className="table-checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={row.rappi}
                          onChange={(e) =>
                            handleInputChange(row.id, 'rappi', e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300"
                        />
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
