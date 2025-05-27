'use client';

import { useState, useEffect, useCallback } from 'react';

import { useDebouncedSave } from '~/hooks/useDebouncedSave';
import { type TransactionRecord } from '~/types';
import { calculateFormulas } from '~/utils/formulas';

interface SaveResult {
  success: boolean;
  error?: string;
}

type InputValue = string | number | boolean | null;
type InputType = 'text' | 'number' | 'date' | 'checkbox';
type HandleInputChange = (id: string, field: keyof TransactionRecord, value: InputValue) => void;

export default function TransactionTable({ 
  initialData,
  onUpdateRecordAction 
}: { 
  initialData: TransactionRecord[];
  onUpdateRecordAction: (records: TransactionRecord[]) => Promise<SaveResult>;
}) {
  const [data, setData] = useState<TransactionRecord[]>(initialData);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [totalSelected, setTotalSelected] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const handleRowSelect = (id: string, _precioNeto: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  useEffect(() => {
    const total = Array.from(selectedRows).reduce((sum, id) => {
      const record = data.find(r => r.id === id);
      return sum + (record?.precioNeto ?? 0);
    }, 0);
    setTotalSelected(total);
  }, [selectedRows, data]);

  const handlePay = async () => {
    const updatedData = data.map(record => {
      if (selectedRows.has(record.id)) {
        return {
          ...record,
          pagado: true,
          boletasRegistradas: totalSelected
        };
      }
      return record;
    });
    
    await onUpdateRecordAction(updatedData);
    setData(updatedData);
    setSelectedRows(new Set());
  };

  const addNewRow = () => {
    const newRow: TransactionRecord = {
      id: crypto.randomUUID(),
      fecha: new Date(),
      tramite: '',
      matricula: null,        // Agregar propiedad opcional
      pagado: false,
      boleta: false,
      boletasRegistradas: 0,
      emitidoPor: '',
      placa: '',
      tipoDocumento: '',
      numeroDocumento: '',
      nombre: '',
      cilindraje: null,       // Agregar propiedad opcional
      tipoVehiculo: null,     // Agregar propiedad opcional
      celular: null,          // Agregar propiedad opcional
      ciudad: '',
      asesor: '',
      novedad: null,          // Agregar propiedad opcional
      precioNeto: 0,
      comisionExtra: false,
      tarifaServicio: 0,
      impuesto4x1000: 0,
      gananciaBruta: 0,
      rappi: false,
      observaciones: null     // Agregar propiedad opcional
    };
    setData([newRow, ...data]);
  };

  const handleSaveSuccess = useCallback(() => {
    setUnsavedChanges(false);
  }, []);

  const debouncedSave = useDebouncedSave(
    onUpdateRecordAction,
    handleSaveSuccess,
    3000
  );

  // Type-safe input change handler
  const handleInputChange: HandleInputChange = useCallback((id, field, value) => {
    setData(prevData => {
      const newData = prevData.map(row => {
        if (row.id === id) {
          const updatedRow = { ...row };
          
          switch (field) {
            case 'fecha':
              updatedRow[field] = typeof value === 'string' ? new Date(value) : row.fecha;
              break;
            case 'precioNeto':
            case 'tarifaServicio':
            case 'impuesto4x1000':
            case 'gananciaBruta':
            case 'boletasRegistradas':
            case 'cilindraje':
              updatedRow[field] = typeof value === 'string' ? Number(value) || 0 : value as number;
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
  }, [debouncedSave]);

  const handleSaveChanges = async () => {
    try {
      await onUpdateRecordAction(data);
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  const renderInput = useCallback((
    row: TransactionRecord, 
    field: keyof TransactionRecord, 
    type: InputType = 'text'
  ) => {
    const value = row[field];
    const inputValue = type === 'checkbox' 
      ? Boolean(value) 
      : (value ?? '');

    return (
      <input
        type={type}
        value={type === 'date' && value instanceof Date 
          ? value.toISOString().split('T')[0]
          : String(inputValue)
        }
        checked={type === 'checkbox' ? Boolean(value) : undefined}
        onChange={(e) => {
          const newValue = type === 'checkbox'
            ? e.target.checked
            : (e.target.value || null);
          handleInputChange(row.id, field, newValue);
        }}
        className={type === 'checkbox' 
          ? "h-4 w-4 rounded border-gray-300" 
          : "w-full rounded border p-1"
        }
      />
    );
  }, [handleInputChange]);

  return (
    <div className="relative">
      <div className="mb-4 flex justify-between">
        <div className="flex gap-4">
          <button
            onClick={addNewRow}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Agregar Registro
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={!unsavedChanges}
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
          >
            {unsavedChanges ? 'Guardar Cambios' : 'Guardado'}
          </button>
        </div>
        {unsavedChanges && (
          <span className="text-sm text-yellow-600">
            Cambios sin guardar...
          </span>
        )}
      </div>

      <div className="overflow-x-auto shadow-md sm:rounded-lg">
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th className="whitespace-nowrap px-6 py-3">Fecha</th>
                <th className="whitespace-nowrap px-6 py-3">Trámite</th>
                <th className="whitespace-nowrap px-6 py-3">Matrícula</th>
                <th className="whitespace-nowrap px-6 py-3">Pagado</th>
                <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3">Boleta</th>
                <th className="whitespace-nowrap px-6 py-3">Boletas Registradas</th>
                <th className="whitespace-nowrap px-6 py-3">Emitido Por</th>
                <th className="whitespace-nowrap px-6 py-3">Placa</th>
                <th className="whitespace-nowrap px-6 py-3">Documento</th>
                <th className="whitespace-nowrap px-6 py-3">#</th>
                <th className="whitespace-nowrap px-6 py-3">Nombre</th>
                <th className="whitespace-nowrap px-6 py-3">Cilindraje</th>
                <th className="whitespace-nowrap px-6 py-3">Tipo Vehículo</th>
                <th className="whitespace-nowrap px-6 py-3">Celular</th>
                <th className="whitespace-nowrap px-6 py-3">Ciudad</th>
                <th className="whitespace-nowrap px-6 py-3">Asesor</th>
                <th className="whitespace-nowrap px-6 py-3">Novedad</th>
                <th className="whitespace-nowrap px-6 py-3">Precio Neto</th>
                <th className="whitespace-nowrap px-6 py-3">Comisión Extra</th>
                <th className="whitespace-nowrap px-6 py-3">Tarifa Servicio</th>
                <th className="whitespace-nowrap px-6 py-3">4x1000</th>
                <th className="whitespace-nowrap px-6 py-3">Ganancia Bruta</th>
                <th className="whitespace-nowrap px-6 py-3">Rappi</th>
                <th className="whitespace-nowrap px-6 py-3">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                // Use formulas in rendering
                const { precioNetoAjustado, impuesto4x1000, gananciaBruta } = calculateFormulas(row);
                const rowWithFormulas = {
                  ...row,
                  precioNeto: precioNetoAjustado,
                  impuesto4x1000,
                  gananciaBruta
                };
                
                return (
                  <tr key={row.id} className="border-b bg-white hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'fecha', 'date')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'tramite')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'matricula')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'pagado', 'checkbox')}
                    </td>
                    <td className="sticky left-0 z-10 bg-white px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleRowSelect(row.id, row.precioNeto)}
                        disabled={row.pagado}
                        className="h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'boletasRegistradas', 'number')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'emitidoPor')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'placa')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'tipoDocumento')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'numeroDocumento')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'nombre')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'cilindraje', 'number')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'tipoVehiculo')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'celular')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'ciudad')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'asesor')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'novedad')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'precioNeto', 'number')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <input
                        type="checkbox"
                        checked={row.comisionExtra}
                        onChange={(e) => handleInputChange(row.id, 'comisionExtra', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'tarifaServicio', 'number')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'impuesto4x1000', 'number')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'gananciaBruta', 'number')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <input
                        type="checkbox"
                        checked={row.rappi}
                        onChange={(e) => handleInputChange(row.id, 'rappi', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderInput(rowWithFormulas, 'observaciones')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRows.size > 0 && (
        <div className="fixed bottom-4 right-4 flex gap-4 rounded-lg bg-white p-4 shadow-lg">
          <div>Total Seleccionado: ${totalSelected.toLocaleString()}</div>
          <button
            onClick={handlePay}
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Pagar Boletas Seleccionadas
          </button>
        </div>
      )}
    </div>
  );
}
