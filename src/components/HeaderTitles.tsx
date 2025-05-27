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
    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
      <tr>
        {/* Todos los th ahora usarán la fuente Lexend */}
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Fecha
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Trámite
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Seleccionar
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Pagado
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Boletas Registradas
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Emitido Por
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Placa
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Tipo Documento
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Número Documento
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Nombre
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Cilindraje
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Tipo Vehículo
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Celular
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Ciudad
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Asesor
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Novedad
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Precio Neto
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Tarifa Servicio
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Comisión Extra
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          4x1000
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Ganancia Bruta
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Rappi
        </th>
        <th scope="col" className="font-lexend px-6 py-3 whitespace-nowrap">
          Observaciones
        </th>
      </tr>
    </thead>
  );
}
