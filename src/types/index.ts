export interface BaseTransactionRecord {
  id: string;
  fecha: Date;
  tramite: string;
  pagado: boolean;
  boleta: boolean;
  boletasRegistradas: number;
  emitidoPor: string;
  placa: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  cilindraje: number | null;
  tipoVehiculo: string | null;
  celular: string | null;
  ciudad: string;
  asesor: string;
  novedad: string | null;
  precioNeto: number;
  comisionExtra: boolean;
  tarifaServicio: number;
  impuesto4x1000: number;
  gananciaBruta: number;
  rappi: boolean;
  observaciones: string | null;
}

export interface CuadreData {
  banco: string | null;
  banco2: string | null;
  fechaCliente: Date | null;
  referencia: string | null;
}

export type TransactionRecord = BaseTransactionRecord;

export interface CuadreRecord extends CuadreData {
  id: string;
  transactionId: string;
  createdAt: Date;
}

export interface ExtendedSummaryRecord extends BaseTransactionRecord, CuadreData {
  totalCombinado: number;
  groupId?: string;
  createdAt?: Date;
}
