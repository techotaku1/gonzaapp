'use client';

import { TransactionRecord } from '~/types';
import { fromDatetimeLocalStringToColombiaDate } from '~/utils/dateUtils';
import { calculateFormulas } from '~/utils/formulas';
import { formatCurrency } from '~/utils/numberFormat';
import { type VehicleType, vehicleTypes } from '~/utils/soatPricing';

import { AsesorSelect } from './AsesorSelect';

import type { InputType, InputValue } from './TransactionTableRow';

export const tipoVehiculoOptions = vehicleTypes;

function getWidth(field: keyof TransactionRecord) {
  switch (field) {
    case 'impuesto4x1000':
      return 'w-[70px]';
    case 'gananciaBruta':
      return 'w-[90px]';
    case 'novedad':
      return 'w-[100px]';
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
}

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
  if (value.includes('HH')) return 'emitido-por-hh';
  return '';
};

// Nueva función para obtener clase de color por trámite - ACTUALIZADA
export const getTramiteColorClass = (
  tramite: string,
  tramiteOptions: { nombre: string; color?: string }[],
  coloresOptions: { nombre: string; valor: string; intensidad: number }[] = []
): string => {
  // Solo aplicar color si NO es SOAT (SOAT usa emitidoPor solo cuando está pagado)
  if (tramite.toUpperCase() === 'SOAT') {
    return '';
  }

  const tramiteRecord = tramiteOptions.find((t) => t.nombre === tramite);
  if (!tramiteRecord?.color) {
    return '';
  }

  // Buscar el color en la tabla de colores
  const colorRecord = coloresOptions.find(
    (c) => c.nombre === tramiteRecord.color
  );

  if (colorRecord) {
    // Crear estilo dinámico basado en la tabla de colores
    return `tramite-dynamic-color`;
  }

  // Fallback a los colores predefinidos
  const colorMap: Record<string, string> = {
    red: 'tramite-color-red',
    blue: 'tramite-color-blue',
    green: 'tramite-color-green',
    yellow: 'tramite-color-yellow',
    purple: 'tramite-color-purple',
    orange: 'tramite-color-orange',
    pink: 'tramite-color-pink',
    gray: 'tramite-color-gray',
    indigo: 'tramite-color-indigo',
    teal: 'tramite-color-teal',
    cyan: 'tramite-color-cyan',
    lime: 'tramite-color-lime',
  };

  return colorMap[tramiteRecord.color.toLowerCase()] || '';
};

// Nueva función para generar estilos dinámicos - ACTUALIZADA
export const generateDynamicColorStyle = (
  tramite: string,
  tramiteOptions: { nombre: string; color?: string }[],
  coloresOptions: { nombre: string; valor: string; intensidad: number }[] = []
): React.CSSProperties => {
  // Solo aplicar color si NO es SOAT (SOAT usa emitidoPor solo cuando está pagado)
  if (tramite.toUpperCase() === 'SOAT') {
    return {};
  }

  const tramiteRecord = tramiteOptions.find((t) => t.nombre === tramite);
  if (!tramiteRecord?.color) {
    return {};
  }

  const colorRecord = coloresOptions.find(
    (c) => c.nombre === tramiteRecord.color
  );
  if (!colorRecord) {
    return {};
  }

  // Crear el estilo CSS dinámico
  const opacity = Math.min(colorRecord.intensidad / 1000, 0.8); // Convertir intensidad a opacidad

  return {
    backgroundColor: `color-mix(in oklch, ${colorRecord.valor} ${opacity * 100}%, transparent)`,
    color: colorRecord.valor.includes('#')
      ? '#1a1a1a' // Color de texto oscuro para colores hex
      : `var(--color-${colorRecord.valor}-900)`, // Color de texto para colores CSS
  };
};

export function useTransactionTableInputs({
  editValues,
  handleInputChangeAction,
  formatCurrencyAction: _formatCurrencyAction,
  parseNumberAction,
  asesores,
  onAddAsesorAction,
  onAddTramiteAction: _onAddTramiteAction,
  onAddNovedadAction,
  onAddEmitidoPorAction,
  tramiteOptions,
  novedadOptions,
  emitidoPorOptions,
  coloresOptions: _coloresOptions = [],
  onOpenColorPicker,
}: {
  editValues: Record<string, Partial<TransactionRecord>>;
  handleInputChangeAction: (
    id: string,
    field: keyof TransactionRecord,
    value: InputValue
  ) => void;
  formatCurrencyAction: (v: number) => string;
  parseNumberAction: (v: string) => number;
  asesores: string[];
  onAddAsesorAction: (nombre: string) => Promise<void>;
  onAddTramiteAction?: (nombre: string, color?: string) => Promise<void>;
  onAddNovedadAction?: (nombre: string) => Promise<void>;
  onAddEmitidoPorAction?: (nombre: string) => Promise<void>;
  tramiteOptions: { nombre: string; color?: string }[];
  novedadOptions: string[];
  emitidoPorOptions: string[];
  coloresOptions?: { nombre: string; valor: string; intensidad: number }[];
  onOpenColorPicker?: (rowId: string) => void; // Cambiar la firma para recibir rowId
}) {
  // Helper: obtiene SIEMPRE el valor local editado si existe, si no el remoto
  const getCellValue = (
    row: TransactionRecord,
    field: keyof TransactionRecord
  ) => {
    if (
      editValues[row.id] &&
      Object.prototype.hasOwnProperty.call(editValues[row.id], field)
    ) {
      return editValues[row.id][field];
    }
    return row[field];
  };

  const renderInput = (
    row: TransactionRecord,
    field: keyof TransactionRecord,
    type: InputType = 'text'
  ) => {
    // SIEMPRE usa el valor local editado si existe
    const value = getCellValue(row, field);
    const isMoneyField = [
      'precioNeto',
      'tarifaServicio',
      'impuesto4x1000',
      'gananciaBruta',
      'boletasRegistradas',
    ].includes(field as string);

    // Para mostrar valores ajustados en tiempo real
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

    // formatValue ahora es función local y tiene acceso a field/isMoneyField
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
      // Cilindraje: solo número, sin formato de moneda
      if (field === 'cilindraje' && typeof val === 'number') {
        return String(val);
      }
      // Formatea campos monetarios correctamente
      if (isMoneyField && typeof val === 'number') {
        // Asegura que no tenga decimales extra
        return `$ ${formatCurrency(Math.round(val))}`;
      }
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

    // En la sección donde se renderiza el select de emitidoPor:
    if (field === 'emitidoPor') {
      return (
        <select
          value={value as string}
          onChange={async (e) => {
            if (e.target.value === '__add_new__') {
              if (onAddEmitidoPorAction) {
                const nombre = prompt(
                  'Ingrese el nuevo valor para "Emitido Por":'
                );
                if (nombre && nombre.trim().length > 0) {
                  await onAddEmitidoPorAction(nombre.trim());
                  handleInputChangeAction(row.id, field, nombre.trim());
                }
              }
            } else {
              handleInputChangeAction(row.id, field, e.target.value);
            }
          }}
          className={`table-select-base w-[105px] rounded border ${getEmitidoPorClass(value as string)}`}
          title={value as string}
        >
          <option value="">Seleccionar...</option>
          {emitidoPorOptions.map((option) => (
            <option
              key={option}
              value={option}
              className={`text-center ${getEmitidoPorClass(option)}`}
            >
              {option}
            </option>
          ))}
          <option value="__add_new__" className="font-bold text-blue-700">
            Agregar nuevo emitido por... ➕
          </option>
        </select>
      );
    }

    // Modificar la sección del renderInput donde se maneja el campo fecha
    if (field === 'fecha') {
      // Asegura el formato correcto para datetime-local: 'YYYY-MM-DDTHH:mm'
      let dateValue = '';
      if (value instanceof Date && !isNaN(value.getTime())) {
        // --- CORREGIDO: Usa los componentes UTC para mostrar la hora que el usuario editó ---
        const pad = (n: number) => n.toString().padStart(2, '0');
        dateValue = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}T${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
      } else if (typeof value === 'string' && value) {
        // Si ya es string, intenta usar los primeros 16 caracteres
        dateValue = value.slice(0, 16);
      }
      return (
        <div className="relative flex w-full items-center justify-center">
          <input
            type="datetime-local"
            value={dateValue}
            onChange={(e) => {
              try {
                // El valor del input es 'YYYY-MM-DDTHH:mm'
                // --- CORREGIDO: convierte a fecha en zona horaria de Colombia ---
                const inputDate = fromDatetimeLocalStringToColombiaDate(
                  e.target.value
                );
                handleInputChangeAction(row.id, field, inputDate);
              } catch (error) {
                console.error('Error converting date:', error);
              }
            }}
            className="table-date-field flex w-[140px] cursor-pointer items-center justify-center rounded border px-0 py-0.5 text-center text-[10px]"
          />
        </div>
      );
    }

    // Corregir renderPlacaInput para evitar errores TS y duplicidad
    const renderPlacaInput = () => (
      <div className="relative flex items-center">
        <input
          type="text"
          value={formatValue(value)}
          title={formatValue(value)}
          onChange={(e) =>
            handleInputChangeAction(row.id, field, e.target.value.toUpperCase())
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
          onChange={(e) =>
            handleInputChangeAction(row.id, field, e.target.value)
          }
          className="table-select-base w-[70px] rounded border border-gray-600"
          title={value as string}
        >
          <option value="">-</option>
          {['CC', 'NIT', 'TI', 'CE', 'PAS'].map((option) => (
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
          onChange={(e) => {
            if (e.target.value === '__add_new__') {
              if (onOpenColorPicker) {
                onOpenColorPicker(row.id); // Pasar el rowId
              }
            } else {
              handleInputChangeAction(row.id, field, e.target.value);
            }
          }}
          className="table-select-base w-[70px] rounded border border-gray-600"
          title={value as string}
        >
          {tramiteOptions.map((option) => (
            <option
              key={typeof option === 'string' ? option : option.nombre}
              value={typeof option === 'string' ? option : option.nombre}
              className="text-center"
            >
              {typeof option === 'string' ? option : option.nombre}
            </option>
          ))}
          <option value="__add_new__" className="font-bold text-blue-700">
            Agregar nuevo trámite... ➕
          </option>
        </select>
      );
    }

    // Inside renderInput function, add these conditions before the final return:
    if (field === 'tipoVehiculo') {
      // Si el valor guardado no está en las opciones, lo agrega temporalmente para mostrarlo seleccionado
      const valueStr = value ? String(value) : '';
      const options: readonly string[] = tipoVehiculoOptions.includes(
        valueStr as VehicleType
      )
        ? tipoVehiculoOptions
        : valueStr && valueStr !== ''
          ? [...tipoVehiculoOptions, valueStr]
          : tipoVehiculoOptions;
      return (
        <select
          value={valueStr}
          onChange={(e) =>
            handleInputChangeAction(row.id, field, e.target.value || null)
          }
          className="table-select-base w-[150px] rounded border border-gray-600"
          title={valueStr}
        >
          <option value="">Seleccionar...</option>
          {options.map((option) => (
            <option
              key={option}
              value={option}
              className="text-center"
              title={option}
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
          onChange={async (e) => {
            if (e.target.value === '__add_new__') {
              if (onAddNovedadAction) {
                const nombre = prompt('Ingrese la nueva novedad:');
                if (nombre && nombre.trim().length > 0) {
                  await onAddNovedadAction(nombre.trim());
                  handleInputChangeAction(row.id, field, nombre.trim());
                }
              }
            } else {
              handleInputChangeAction(row.id, field, e.target.value);
            }
          }}
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
          <option value="__add_new__" className="font-bold text-blue-700">
            Agregar nueva novedad... ➕
          </option>
        </select>
      );
    }

    // Usar adjustedValue en vez de value en los inputs de dinero
    if (
      field === 'precioNeto' ||
      field === 'tarifaServicio' ||
      field === 'impuesto4x1000' ||
      field === 'gananciaBruta' ||
      field === 'boletasRegistradas' // <-- Añadido aquí para que use el mismo input formateado
    ) {
      return (
        <div className={`relative flex items-center`}>
          <input
            type="text"
            value={formatValue(adjustedValue)}
            title={formatValue(adjustedValue)}
            onChange={(e) => {
              const newValue: InputValue = parseNumberAction(e.target.value);
              handleInputChangeAction(row.id, field, newValue);
            }}
            className={`flex items-center justify-center overflow-hidden rounded border px-0.5 py-0.5 text-center text-[10px] text-ellipsis ${getWidth(field)} table-numeric-field hover:overflow-visible hover:text-clip`}
          />
        </div>
      );
    }

    // Usa AsesorSelect como input para el campo asesor
    if (field === 'asesor') {
      return (
        <AsesorSelect
          value={String(value ?? '')}
          onChange={(newValue: string) =>
            handleInputChangeAction(row.id, 'asesor', newValue)
          }
          asesores={asesores}
          onAddAsesorAction={onAddAsesorAction}
        />
      );
    }

    return (
      <div className={`relative ${isMoneyField ? 'flex items-center' : ''}`}>
        <input
          // ...existing code...
          value={(() => {
            const v = getCellValue(row, field);
            if (isMoneyField && typeof v === 'number') return v;
            if (typeof v === 'boolean') return v ? '1' : '';
            if (v === null || typeof v === 'undefined') return '';
            return v as string | number;
          })()}
          title={formatValue(value)} // Agregar tooltip a todos los inputs
          onChange={(e) => {
            let newValue: InputValue;
            if (field === 'cilindraje') {
              newValue =
                e.target.value === ''
                  ? null
                  : parseNumberAction(e.target.value);
            } else if (field === 'numeroDocumento' || field === 'celular') {
              const onlyNumbers = e.target.value.replace(/[^\d]/g, '');
              newValue = onlyNumbers === '' ? null : onlyNumbers;
            } else if (isMoneyField) {
              newValue = parseNumberAction(e.target.value);
            } else if (type === 'checkbox') {
              newValue = e.target.checked;
            } else if (type === 'number') {
              newValue = e.target.value ? Number(e.target.value) : null;
            } else {
              newValue = e.target.value || null;
            }
            handleInputChangeAction(row.id, field, newValue);
          }}
          className={`$${
            type === 'checkbox'
              ? 'h-3 w-3 rounded border-gray-600'
              : `flex items-center justify-center overflow-hidden rounded border px-0.5 py-0.5 text-center text-[10px] text-ellipsis ${getWidth(field)} ${
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
  };

  return {
    renderInput,
  };
}
