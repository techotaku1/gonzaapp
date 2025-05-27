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
    <thead className="sticky top-0 z-30">
      <tr className="bg-gray-50 uppercase">
        {tableHeaders.map((header) => (
          <th
            key={header}
            className={`bg-gray-50 px-6 py-3 whitespace-nowrap ${
              header === 'Boleta' ? 'sticky left-0 z-10' : ''
            }`}
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}
