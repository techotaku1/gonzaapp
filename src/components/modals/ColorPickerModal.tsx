'use client';

import React, { useState } from 'react';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tramiteName: string, selectedColor?: string) => void;
  onDelete?: (tramiteName: string) => void; // Nueva prop para eliminar
  coloresOptions: { nombre: string; valor: string; intensidad: number }[];
  existingTramites?: { nombre: string; color?: string }[]; // Nueva prop para mostrar trámites existentes
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onDelete,
  coloresOptions,
  existingTramites = [],
}) => {
  const [tramiteName, setTramiteName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showExisting, setShowExisting] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null); // Nuevo estado

  const handleConfirm = () => {
    if (tramiteName.trim()) {
      onConfirm(tramiteName.trim(), selectedColor || undefined);
      setJustCreated(tramiteName.trim()); // Marcar como recién creado
      setShowExisting(true); // Cambiar a vista de existentes
      setTramiteName('');
      setSelectedColor('');
      // NO cerrar el modal para mostrar la opción de eliminar
    }
  };

  const handleDelete = (nombreTramite: string) => {
    if (
      onDelete &&
      confirm(`¿Está seguro de eliminar el trámite "${nombreTramite}"?`)
    ) {
      onDelete(nombreTramite);
      setJustCreated(null); // Limpiar estado
    }
  };

  const handleCancel = () => {
    setTramiteName('');
    setSelectedColor('');
    setJustCreated(null); // Limpiar estado
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

  // Filtrar solo colores con intensidad 500 para trámites
  const coloresFiltrados = coloresOptions.filter(
    (color) => color.intensidad === 500
  );

  return (
    <div className="bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="max-h-[90vh] overflow-y-auto p-6">
          <h3 className="mb-6 text-xl font-semibold text-gray-900">
            Gestionar Trámites
          </h3>

          {/* Pestañas */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setShowExisting(false)}
              className={`rounded-md px-6 py-3 font-medium transition-colors ${
                !showExisting
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Agregar Nuevo
            </button>
            <button
              onClick={() => setShowExisting(true)}
              className={`rounded-md px-6 py-3 font-medium transition-colors ${
                showExisting
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Trámites Existentes ({existingTramites.length})
            </button>
          </div>

          {!showExisting ? (
            /* Vista de agregar nuevo */
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Columna izquierda: Input */}
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700">
                    Nombre del trámite:
                  </label>
                  <input
                    type="text"
                    value={tramiteName}
                    onChange={(e) => setTramiteName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Ej: LICENCIA DE CONDUCIR"
                    autoFocus
                  />
                </div>

                {/* Preview del trámite */}
                {tramiteName && (
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                      Vista previa:
                    </label>
                    <div
                      className="rounded-md border p-6 text-center text-lg font-medium"
                      style={
                        selectedColor ? getPreviewStyle(selectedColor) : {}
                      }
                    >
                      {tramiteName.toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              {/* Columna derecha: Selector de colores */}
              <div className="lg:col-span-2">
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  Color (opcional):
                </label>
                <div className="grid grid-cols-3 gap-4 xl:grid-cols-4">
                  {/* Opción sin color */}
                  <button
                    onClick={() => setSelectedColor('')}
                    className={`flex items-center justify-center rounded-md border-2 p-4 text-sm font-medium transition-all ${
                      selectedColor === ''
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Automático
                  </button>

                  {/* Opciones de colores disponibles - SOLO intensidad 500 */}
                  {coloresFiltrados.map((color) => (
                    <button
                      key={color.nombre}
                      onClick={() => setSelectedColor(color.nombre)}
                      className={`flex flex-col items-center justify-center rounded-md border-2 p-4 text-xs font-medium transition-all ${
                        selectedColor === color.nombre
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={getPreviewStyle(color.nombre)}
                    >
                      <div className="mb-2 text-center font-semibold">
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
            /* Vista de trámites existentes */
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {existingTramites.map((tramite) => (
                  <div
                    key={tramite.nombre}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      justCreated === tramite.nombre
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : ''
                    }`}
                    style={tramite.color ? getPreviewStyle(tramite.color) : {}}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {tramite.nombre}
                        {justCreated === tramite.nombre && (
                          <span className="ml-2 text-sm font-bold text-blue-600">
                            ✨ Recién creado
                          </span>
                        )}
                      </div>
                      <div className="truncate text-sm opacity-75">
                        Color: {tramite.color ?? 'Sin color'}
                      </div>
                    </div>
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(tramite.nombre)}
                        className="ml-4 flex-shrink-0 rounded-md bg-red-500 px-3 py-2 text-sm text-white transition-colors hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
                {existingTramites.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500">
                    No hay trámites registrados
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="mt-8 flex justify-end gap-4 border-t pt-6">
            <button
              onClick={handleCancel}
              className="rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {showExisting && justCreated ? 'Cerrar' : 'Cancelar'}
            </button>
            {!showExisting && (
              <button
                onClick={handleConfirm}
                disabled={!tramiteName.trim()}
                className="rounded-md bg-blue-500 px-6 py-3 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Agregar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPickerModal;
