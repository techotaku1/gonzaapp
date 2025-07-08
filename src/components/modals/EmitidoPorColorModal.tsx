'use client';

import React, { useState } from 'react';

interface EmitidoPorColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nombre: string, selectedColor?: string) => void;
  onDelete?: (nombre: string) => void;
  coloresOptions: { nombre: string; valor: string; intensidad: number }[];
  existingEmitidoPor?: { nombre: string; color?: string }[];
}

const EmitidoPorColorModal: React.FC<EmitidoPorColorModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onDelete,
  coloresOptions,
  existingEmitidoPor = [],
}) => {
  const [nombre, setNombre] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showExisting, setShowExisting] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null); // Nuevo estado

  const handleConfirm = () => {
    if (nombre.trim()) {
      onConfirm(nombre.trim(), selectedColor || undefined);
      setJustCreated(nombre.trim()); // Marcar como recién creado
      setShowExisting(true); // Cambiar a vista de existentes
      setNombre('');
      setSelectedColor('');
      // NO cerrar el modal para mostrar la opción de eliminar
    }
  };

  const handleDelete = (nombreItem: string) => {
    if (onDelete && confirm(`¿Está seguro de eliminar "${nombreItem}"?`)) {
      onDelete(nombreItem);
      setJustCreated(null); // Limpiar estado
    }
  };

  const handleCancel = () => {
    setNombre('');
    setSelectedColor('');
    setJustCreated(null); // Limpiar estado
    onClose();
  };

  if (!isOpen) return null;

  // Filtrar solo colores con intensidad 300 para emitidoPor
  const coloresFiltrados = coloresOptions.filter(
    (color) => color.intensidad === 300
  );

  // Generar estilo de preview dinámico con intensidad 300
  const getPreviewStyle = (color: string) => {
    const colorRecord = coloresFiltrados.find((c) => c.nombre === color);
    if (!colorRecord) return {};

    // Usar intensidad fija de 300 para emitidoPor
    const opacity = 0.3; // 300/1000
    return {
      backgroundColor: `color-mix(in oklch, ${colorRecord.valor} ${opacity * 100}%, transparent)`,
      color: colorRecord.valor.includes('#')
        ? '#1a1a1a'
        : `var(--color-${colorRecord.valor}-900)`,
    };
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="w-full max-w-6xl rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Gestionar Emitido Por
        </h3>

        {/* Pestañas */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setShowExisting(false)}
            className={`rounded-md px-4 py-2 font-medium transition-colors ${
              !showExisting
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Agregar Nuevo
          </button>
          <button
            onClick={() => setShowExisting(true)}
            className={`rounded-md px-4 py-2 font-medium transition-colors ${
              showExisting
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Existentes ({existingEmitidoPor.length})
          </button>
        </div>

        {!showExisting ? (
          /* Vista de agregar nuevo */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Columna izquierda: Input y preview */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nombre del emisor:
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  placeholder="Ej: Panel Juan, Previ Sonia..."
                  autoFocus
                />
              </div>

              {/* Preview */}
              {nombre && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Vista previa:
                  </label>
                  <div
                    className="rounded-md border p-4 text-center text-lg font-medium"
                    style={selectedColor ? getPreviewStyle(selectedColor) : {}}
                  >
                    {nombre.toUpperCase()}
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
                {/* Opción sin color */}
                <button
                  onClick={() => setSelectedColor('')}
                  className={`flex items-center justify-center rounded-md border-2 p-3 text-sm font-medium transition-all ${
                    selectedColor === ''
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Sin Color
                </button>

                {/* Opciones de colores disponibles - SOLO intensidad 300 */}
                {coloresFiltrados.map((color) => (
                  <button
                    key={color.nombre}
                    onClick={() => setSelectedColor(color.nombre)}
                    className={`flex flex-col items-center justify-center rounded-md border-2 p-3 text-xs font-medium transition-all ${
                      selectedColor === color.nombre
                        ? 'border-green-500 ring-2 ring-green-200'
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
        ) : (
          /* Vista de existentes */
          <div className="max-h-96 overflow-y-auto">
            <div className="grid gap-3">
              {existingEmitidoPor.map((item) => (
                <div
                  key={item.nombre}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    justCreated === item.nombre
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                      : ''
                  }`}
                  style={item.color ? getPreviewStyle(item.color) : {}}
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.nombre}
                      {justCreated === item.nombre && (
                        <span className="ml-2 text-sm font-bold text-green-600">
                          ✨ Recién creado
                        </span>
                      )}
                    </div>
                    <div className="text-sm opacity-75">
                      Color: {item.color ?? 'Sin color'}
                    </div>
                  </div>
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(item.nombre)}
                      className="ml-4 rounded-md bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
              {existingEmitidoPor.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  No hay emisores registrados
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showExisting && justCreated ? 'Cerrar' : 'Cancelar'}
          </button>
          {!showExisting && (
            <button
              onClick={handleConfirm}
              disabled={!nombre.trim()}
              className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Agregar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmitidoPorColorModal;
