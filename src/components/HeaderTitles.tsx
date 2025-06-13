export default function HeaderTitles({
  isDeleteMode = false,
  isAsesorSelectionMode,
}: {
  isDeleteMode?: boolean;
  isAsesorSelectionMode?: boolean;
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

  return (
    <thead className="sticky-header">
      <tr className="bg-gray-50">
        {isDeleteMode && (
          <th
            scope="col"
            className="table-header relative w-10 border-r border-b bg-white text-center whitespace-nowrap"
          >
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
        {tableHeaders.map((header) => (
          <th
            key={header}
            scope="col"
            className="table-header relative border-r border-b border-gray-600 bg-white whitespace-nowrap"
          >
            {header}
          </th>
        ))}
        {isAsesorSelectionMode && (
          <th className="table-header">Seleccionar Asesor</th>
        )}
      </tr>
    </thead>
  );
}
