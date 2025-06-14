import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  integer,
  decimal,
} from 'drizzle-orm/pg-core';

export const transactions = pgTable('transactions', {
  id: varchar('id').primaryKey(),
  fecha: timestamp('fecha').notNull(), // Cambiado de date a timestamp
  tramite: varchar('tramite').notNull(),
  pagado: boolean('pagado').notNull().default(false),
  boleta: boolean('boleta').notNull().default(false),
  boletasRegistradas: decimal('boletas_registradas', {
    precision: 12,
    scale: 2,
  }).notNull(),
  emitidoPor: varchar('emitido_por').notNull(),
  placa: varchar('placa').notNull(),
  tipoDocumento: varchar('tipo_documento').notNull(),
  numeroDocumento: varchar('numero_documento').notNull(),
  nombre: varchar('nombre').notNull(),
  cilindraje: integer('cilindraje'),
  tipoVehiculo: varchar('tipo_vehiculo'),
  celular: varchar('celular'),
  ciudad: varchar('ciudad').notNull(),
  asesor: varchar('asesor').notNull(),
  novedad: varchar('novedad'),
  precioNeto: decimal('precio_neto', { precision: 12, scale: 2 }).notNull(),
  comisionExtra: boolean('comision_extra').notNull().default(false),
  tarifaServicio: decimal('tarifa_servicio', {
    precision: 12,
    scale: 2,
  }).notNull(),
  impuesto4x1000: decimal('impuesto_4x1000', {
    precision: 12,
    scale: 2,
  }).notNull(),
  gananciaBruta: decimal('ganancia_bruta', {
    precision: 12,
    scale: 2,
  }).notNull(),
  rappi: boolean('rappi').notNull().default(false),
  observaciones: varchar('observaciones'),
  banco: varchar('banco'),
  banco2: varchar('banco2'), // Nuevo campo para segundo banco
  fechaCliente: timestamp('fecha_cliente'), // Nueva fecha para el cliente
  referencia: varchar('referencia'),
});
