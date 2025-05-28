export default function HeaderTitles() {
  const tableHeaders = [
    'Fecha',
    'Trámite',
    'Seleccionar',
    'Pagado',
    'Boletas Registradas',
    'Emitido Por',
    'Placa',
    'Tipo Doc',
    'Número Doc',
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
    <thead>
      <tr className="bg-gray-50">
        {tableHeaders.map((header) => (
          <th
            key={header}
            scope="col"
            className="table-header px-2 py-2 whitespace-nowrap"
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}
