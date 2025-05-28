export default function HeaderTitles() {
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
        {tableHeaders.map((header) => (
          <th
            key={header}
            scope="col"
            className="table-header relative border-r border-b bg-white border-gray-400 whitespace-nowrap"
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}
