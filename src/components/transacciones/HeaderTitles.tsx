import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';

export default function HeaderTitles({
  isDeleteMode = false,
}: {
  isDeleteMode?: boolean;
}) {
  const tableHeaders = [
    'Fecha',
    'Trámite',
    'Boleta',
    'Pagado',
    'Boletas Registradas',
    'Emitido Por',
    'Placa',
    'Documento',
    '#',
    'Nombre',
    'Cilindraje',
    'Tipo Vehículo',
    'Celular',
    'Ciudad',
    'Asesor',
    'Novedad',
    'Precio Neto',
    'Tarifa Servicio',
    'Com Extra',
    '4x1000',
    'Ganancia Bruta',
    'Rappi',
    'Observaciones',
  ];

  // Estado local para forzar re-render cuando cambia el global
  const [fechaExpand, setFechaExpand] = useState(
    typeof window !== 'undefined' ? window.__fechaColExpand : false
  );

  useEffect(() => {
    const update = () => setFechaExpand(window.__fechaColExpand);
    if (typeof window !== 'undefined') {
      window.__fechaColExpandListeners.add(update);
      setFechaExpand(window.__fechaColExpand);
      return () => {
        window.__fechaColExpandListeners.delete(update);
      };
    }
  }, []);

  const handleToggleFecha = () => {
    if (typeof window !== 'undefined') {
      window.__fechaColExpand = !window.__fechaColExpand;
      window.__fechaColExpandListeners.forEach((fn) => fn());
    }
  };

  return (
    <thead className="sticky top-0 z-50 bg-gray-50">
      <tr className="[&>th]:table-header">
        {/* Si hay modo delete o asesor, agregar celdas vacías */}
        {isDeleteMode && (
          <th scope="col" className="w-10 whitespace-nowrap">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="h-4 w-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
          </th>
        )}
        {/* Nueva columna: Creador */}
        <th className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-gray-800 whitespace-nowrap">
          Creador
        </th>
        {/* Icono de calendario para la columna fecha */}
        <th
          scope="col"
          className="table-header sticky left-0 z-20 cursor-pointer border-r border-gray-600 bg-gray-50 select-none"
          onClick={handleToggleFecha}
          style={{
            minWidth: fechaExpand ? 120 : 32,
            maxWidth: fechaExpand ? 180 : 32,
            width: fechaExpand ? 140 : 32,
            textAlign: 'center',
          }}
          title={
            fechaExpand ? 'Contraer columna fecha' : 'Expandir columna fecha'
          }
        >
          {fechaExpand ? (
            <span
              className="text-md font-semibold"
              style={{
                color: 'black',
                fontFamily:
                  'var(--font-table-text), var(--font-lexend), sans-serif',
              }}
            >
              Fecha
            </span>
          ) : (
            <Calendar size={20} className="mx-auto text-gray-500" />
          )}
        </th>
        {tableHeaders.slice(1).map((header) => (
          <th key={header} scope="col" className="table-header whitespace-nowrap">
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}
