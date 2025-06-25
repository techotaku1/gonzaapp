import React, { useState } from 'react';
import useSWR from 'swr';

interface Props {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
}

const AsesorSelect: React.FC<Props> = ({ value, onChange, className }) => {
  // SWR para obtener asesores únicos
  const { data: asesoresData, mutate } = useSWR<string[]>(
    '/api/asesores',
    async (url: string) => {
      const res = await fetch(url);
      const json: { asesores: string[] } = await res.json();
      return json.asesores;
    }
  );
  const [localAsesores] = useState<string[]>([]);
  const asesoresList =
    localAsesores.length > 0 ? localAsesores : (asesoresData ?? []);

  // Handler para agregar nuevo asesor
  const handleAddAsesor = async () => {
    const nombre = prompt('Ingrese el nombre del nuevo asesor:');
    if (nombre && nombre.trim().length > 0) {
      const nuevo = nombre.trim();
      // POST a la API para agregar asesor
      const res = await fetch('/api/asesores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevo }),
      });
      if (res.ok) {
        mutate(); // Refresca la lista desde la BD
        onChange(nuevo);
      } else {
        alert('Error al agregar asesor.');
      }
    }
  };

  return (
    <div className="relative flex items-center">
      <select
        value={value}
        onChange={async (e) => {
          if (e.target.value === '__add_new__') {
            await handleAddAsesor();
          } else {
            onChange(e.target.value);
          }
        }}
        className={`table-select-base w-[120px] rounded border border-gray-300 bg-gray-400 px-2 py-1 text-[13px] font-semibold text-white focus:ring-2 focus:ring-blue-400 focus:outline-none ${className}`}
        style={{ fontWeight: 600 }}
        title={value}
      >
        <option value="" className="text-white">
          Seleccionar...
        </option>
        {asesoresList.map((asesor) => (
          <option
            key={asesor}
            value={asesor}
            className="font-semibold text-white"
          >
            {asesor}
          </option>
        ))}
        <option value="__add_new__" className="font-bold text-white">
          Agregar nuevo asesor... ➕
        </option>
      </select>
    </div>
  );
};

export default AsesorSelect;
