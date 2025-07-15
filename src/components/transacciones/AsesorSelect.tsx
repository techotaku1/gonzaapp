import React from 'react';

export interface AsesorSelectProps {
  value: string;
  onChange: (newValue: string) => void;
  asesores: string[];
  onAddAsesorAction: (nombre: string) => Promise<void>;
  className?: string; // Agregamos esta prop
}

export const AsesorSelect: React.FC<AsesorSelectProps> = ({
  value,
  onChange,
  asesores,
  onAddAsesorAction,
  className = '', // Prop con valor predeterminado vacío
}) => {
  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === '__add_new__') {
          const nombre = prompt('Ingrese el nombre del nuevo asesor:');
          if (nombre && nombre.trim().length > 0) {
            void onAddAsesorAction(nombre.trim()).then(() => {
              onChange(nombre.trim());
            });
          }
        } else {
          onChange(e.target.value);
        }
      }}
      className={`table-select-base w-[120px] rounded border ${className}`} // La clase className sobreescribirá la clase border-gray-600
      title={value}
    >
      <option value="">Seleccionar...</option>
      {asesores.map((option) => (
        <option key={option} value={option} className="text-center">
          {option}
        </option>
      ))}
      <option value="__add_new__" className="font-bold text-green-700">
        Agregar nuevo asesor... ➕
      </option>
    </select>
  );
};
