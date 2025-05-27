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
    <thead className="bg-gray-50 text-[14px] text-black">
      <tr>
        {tableHeaders.map((header) => {
          const noBorderRight = [
            'Comisión Extra', // Headers que no deben tener borde derecho
          ].includes(header);

          return (
            <th
              key={header}
              scope="col"
              className={`table-header text-center whitespace-nowrap ${
                noBorderRight ? 'border-r-0' : ''
              }`}
            >
              {header}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
