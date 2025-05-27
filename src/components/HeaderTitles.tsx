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
    <thead className="bg-gray-50 text-[16px] text-black">
      <tr>
        {tableHeaders.map((header) => (
          <th
            key={header}
            scope="col"
            style={{
              minWidth: header === 'Trámite' ? '80px' : 'auto',
              position: 'relative',
            }}
            className="table-header relative border-t border-r border-gray-200 whitespace-nowrap"
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}
