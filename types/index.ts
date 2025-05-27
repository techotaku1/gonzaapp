export interface TransactionRecord {
  id: string;
  fecha: Date;
  tramite: string;
  matricula?: string;
  pagado: boolean;
  boleta: boolean;
  boletasRegistradas: number;
  emitidoPor: string;
  placa: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  cilindraje?: number;
  tipoVehiculo?: string;
  celular?: string;
  ciudad: string;
  asesor: string;
  novedad?: string;
  precioNeto: number;
  comisionExtra: boolean;
  tarifaServicio: number;
  impuesto4x1000: number;
  gananciaBruta: number;
  rappi: boolean;
  observaciones?: string;
}
