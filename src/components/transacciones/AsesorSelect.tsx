import React from 'react';

export interface AsesorSelectProps {
  value: string;
  onChange: (newValue: string) => void;
  asesores: string[];
  onAddAsesorAction: (nombre: string) => Promise<void>;
  className?: string;
}

export const AsesorSelect: React.FC<AsesorSelectProps> = ({
  value,
  onChange,
  asesores,
  onAddAsesorAction,
  className,
}) => {
  // Handler para agregar nuevo asesor
  const handleAddAsesor = async () => {
    const nombre = prompt('Ingrese el nombre del nuevo asesor:');
    if (nombre && nombre.trim().length > 0) {
      await onAddAsesorAction(nombre.trim());
      onChange(nombre.trim()); // Selecciona automáticamente el nuevo asesor
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
        className={`table-select-base w-[120px] text-black rounded border bg-gray-400 px-2 py-1 text-[13px] font-semibold focus:ring-2 focus:ring-blue-400 focus:outline-none ${className}`}
        style={{
          fontWeight: 600,
          borderColor: '#000000 !important', // Forzar borde negro
        }}
        title={value}
      >
        <option value="" className="text-white">
          Seleccionar...
        </option>
        {asesores.map((asesor) => (
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
