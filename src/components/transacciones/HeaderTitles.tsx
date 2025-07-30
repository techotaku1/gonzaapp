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

  return (
    <thead className="sticky top-0 z-50 bg-gray-50">
      <tr className="[&>th]:table-header">
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
        {tableHeaders.map((header, idx) => (
          <th
            key={header}
            scope="col"
            className={
              idx === 0
                ? // Sticky a la izquierda, borde derecho, fondo y z-index alto
                  'sticky left-0 z-20 table-header border-r border-gray-600 bg-gray-50'
                : 'table-header whitespace-nowrap'
            }
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}
