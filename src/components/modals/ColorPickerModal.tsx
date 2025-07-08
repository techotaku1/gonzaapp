'use client';

import React, { useState } from 'react';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tramiteName: string, selectedColor?: string) => void; // Cambiar a opcional
  coloresOptions: { nombre: string; valor: string; intensidad: number }[];
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  coloresOptions,
}) => {
  const [tramiteName, setTramiteName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const handleConfirm = () => {
    if (tramiteName.trim()) {
      onConfirm(tramiteName.trim(), selectedColor || undefined);
      setTramiteName('');
      setSelectedColor('');
      onClose();
    }
  };

  const handleCancel = () => {
    setTramiteName('');
    setSelectedColor('');
    onClose();
  };

  if (!isOpen) return null;

  // Generar estilo de preview dinámico
  const getPreviewStyle = (color: string) => {
    const colorRecord = coloresOptions.find((c) => c.nombre === color);
    if (!colorRecord) return {};

    const opacity = Math.min(colorRecord.intensidad / 1000, 0.8);
    return {
      backgroundColor: `color-mix(in oklch, ${colorRecord.valor} ${opacity * 100}%, transparent)`,
      color: colorRecord.valor.includes('#')
        ? '#1a1a1a'
        : `var(--color-${colorRecord.valor}-900)`,
    };
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
        {' '}
        {/* Cambiar de max-w-md a max-w-4xl */}
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Agregar Nuevo Trámite
        </h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {' '}
          {/* Layout en 2 columnas */}
          {/* Columna izquierda: Input y preview */}
          <div className="space-y-4">
            {/* Input para nombre del trámite */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nombre del trámite:
              </label>
              <input
                type="text"
                value={tramiteName}
                onChange={(e) => setTramiteName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: LICENCIA DE CONDUCIR"
                autoFocus
              />
            </div>

            {/* Preview del trámite */}
            {tramiteName && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Vista previa:
                </label>
                <div
                  className="rounded-md border p-4 text-center text-lg font-medium"
                  style={selectedColor ? getPreviewStyle(selectedColor) : {}}
                >
                  {tramiteName.toUpperCase()}
                </div>
              </div>
            )}
          </div>
          {/* Columna derecha: Selector de colores */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Color (opcional):
            </label>
            <div className="grid grid-cols-4 gap-2">
              {' '}
              {/* Cambiar de 3 a 4 columnas */}
              {/* Opción sin color */}
              <button
                onClick={() => setSelectedColor('')}
                className={`flex items-center justify-center rounded-md border-2 p-3 text-sm font-medium transition-all ${
                  selectedColor === ''
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                }`}
              >
                Automático
              </button>
              {/* Opciones de colores disponibles */}
              {coloresOptions.map((color) => (
                <button
                  key={color.nombre}
                  onClick={() => setSelectedColor(color.nombre)}
                  className={`flex flex-col items-center justify-center rounded-md border-2 p-3 text-xs font-medium transition-all ${
                    selectedColor === color.nombre
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={getPreviewStyle(color.nombre)}
                >
                  <div className="mb-1 text-center font-semibold">
                    {color.nombre}
                  </div>
                  <div className="text-center text-xs opacity-80">
                    {color.valor}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Botones */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!tramiteName.trim()}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPickerModal;
