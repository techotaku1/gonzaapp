'use client';

import { useState, useEffect } from 'react';

import { type TransactionRecord } from '~/types';

import { calculateFormulas } from '../utils/formulas';

export default function TransactionTable({ 
  initialData,
  onUpdateRecordAction 
}: { 
  initialData: TransactionRecord[];
  onUpdateRecordAction: (records: TransactionRecord[]) => Promise<void>;
}) {
  const [data, setData] = useState<TransactionRecord[]>(initialData);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [totalSelected, setTotalSelected] = useState(0);

  const handleRowSelect = (id: string) => {
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

  return (
    <div className="relative">
      <div className="mb-4 flex justify-between">
        <button
          onClick={addNewRow}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Agregar Registro
        </button>
        {selectedRows.size > 0 && (
          <div className="fixed bottom-4 right-4 flex gap-4 rounded-lg bg-white p-4 shadow-lg">
            <div>Total Seleccionado: ${totalSelected.toLocaleString()}</div>
            <button
              onClick={handlePay}
              className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            >
              Pagar Seleccionados
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700">
            <tr>
              <th className="px-6 py-3">Seleccionar</th>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Trámite</th>
              <th className="px-6 py-3">Matrícula</th>
              <th className="px-6 py-3">Pagado</th>
              <th className="px-6 py-3">Boleta</th>
              <th className="px-6 py-3">Boletas Registradas</th>
              <th className="px-6 py-3">Precio Neto Ajustado</th>
              <th className="px-6 py-3">4x1000</th>
              <th className="px-6 py-3">Ganancia Bruta</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const formulas = calculateFormulas(row);
              return (
                <tr key={row.id} className="border-b bg-white hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => handleRowSelect(row.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">{row.id}</td>
                  <td className="px-6 py-4">{row.fecha.toLocaleDateString()}</td>
                  <td className="px-6 py-4">{row.tramite}</td>
                  <td className="px-6 py-4">{row.matricula}</td>
                  <td className="px-6 py-4">{row.pagado ? 'Sí' : 'No'}</td>
                  <td className="px-6 py-4">{row.boleta ? 'Sí' : 'No'}</td>
                  <td className="px-6 py-4">{row.boletasRegistradas}</td>
                  <td className="px-6 py-4">${formulas.precioNetoAjustado.toLocaleString()}</td>
                  <td className="px-6 py-4">${formulas.impuesto4x1000.toLocaleString()}</td>
                  <td className="px-6 py-4">${formulas.gananciaBruta.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
