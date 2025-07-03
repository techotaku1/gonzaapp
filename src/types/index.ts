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
  banco: string;
  monto?: number;
  pagado?: boolean;
  fechaCliente: Date | null;
  referencia: string;
}

export type TransactionRecord = BaseTransactionRecord;

export interface CuadreRecord extends CuadreData {
  id: string;
  transactionId: string;
  createdAt: Date;
}

export interface ExtendedSummaryRecord extends BaseTransactionRecord {
  totalCombinado: number;
  banco: string;
  monto: number;
  pagado: boolean;
  fechaCliente: Date | null;
  referencia: string;
  groupId?: string;
  createdAt?: Date;
  cuadreId: string; // <-- Agregado para exponer el id de la tabla cuadre
}

export interface AsesorRecord {
  id: string;
  nombre: string;
  createdAt: Date;
}

export interface TramiteRecord {
  id: string;
  nombre: string;
}

export interface NovedadRecord {
  id: string;
  nombre: string;
}

export interface EmitidoPorRecord {
  id: string;
  nombre: string;
}
