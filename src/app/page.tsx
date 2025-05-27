import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import TransactionTable from '~/components/TransactionTable';
import { db } from '~/server/db';
import { transactions } from '~/server/db/schema';
import { type TransactionRecord } from '~/types';

async function updateRecordsAction(records: TransactionRecord[]) {
  'use server';

  for (const record of records) {
    const updateData = {
      id: record.id,
      fecha: record.fecha.toISOString(),
      tramite: record.tramite,
      matricula: record.matricula,
      pagado: record.pagado,
      boleta: record.boleta,
      boletasRegistradas: String(record.boletasRegistradas),
      emitidoPor: record.emitidoPor,
      placa: record.placa,
      tipoDocumento: record.tipoDocumento,
      numeroDocumento: record.numeroDocumento,
      nombre: record.nombre,
      cilindraje: record.cilindraje ? Number(record.cilindraje) : null,
      tipoVehiculo: record.tipoVehiculo,
      celular: record.celular,
      ciudad: record.ciudad,
      asesor: record.asesor,
      novedad: record.novedad,
      precioNeto: String(record.precioNeto),
      comisionExtra: record.comisionExtra,
      tarifaServicio: String(record.tarifaServicio),
      impuesto4x1000: String(record.impuesto4x1000),
      gananciaBruta: String(record.gananciaBruta),
      rappi: record.rappi,
      observaciones: record.observaciones,
    };

    await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, record.id));
  }

  revalidatePath('/');
}

export default async function HomePage() {
  const data = await db
    .select()
    .from(transactions)
    .orderBy(transactions.fecha);

  const initialData: TransactionRecord[] = data.map((record) => ({
    ...record,
    fecha: new Date(record.fecha),
    boletasRegistradas: Number(record.boletasRegistradas),
    precioNeto: Number(record.precioNeto),
    tarifaServicio: Number(record.tarifaServicio),
    impuesto4x1000: Number(record.impuesto4x1000),
    gananciaBruta: Number(record.gananciaBruta),
    matricula: record.matricula ?? null,
    cilindraje: record.cilindraje ?? null,
    tipoVehiculo: record.tipoVehiculo ?? null,
    celular: record.celular ?? null,
    novedad: record.novedad ?? null,
    observaciones: record.observaciones ?? null,
  }));

  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-8 text-3xl font-bold">Registro de Transacciones</h1>
      <TransactionTable
        initialData={initialData}
        onUpdateRecordAction={updateRecordsAction}
      />
    </main>
  );
}
