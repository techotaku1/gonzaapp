export const tableHeaders = [
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
  'Comisión Extra',
  '4x1000',
  'Ganancia Bruta',
  'Rappi',
  'Observaciones',
] as const;

export default function HeaderTitles() {
  return (
    <thead className="bg-gray-50 text-[13px] text-black">
      <tr>
        {tableHeaders.map((header, index) => {
          const isNumericHeader = [
            'Precio Neto',
            'Tarifa Servicio',
            '4x1000',
            'Ganancia Bruta',
            'Boletas Registradas',
            'Cilindraje',
            '#',
          ].includes(header);

          return (
            <th
              key={header}
              scope="col"
              className={`table-header text-center whitespace-nowrap ${
                isNumericHeader ? 'text-center' : 'text-center'
              } ${index === tableHeaders.length - 1 ? 'border-r-0' : ''}`}
            >
              {header}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
