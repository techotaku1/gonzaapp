'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { db } from '~/server/db';
import { transactions } from '~/server/db/schema';

import type { TransactionRecord } from '~/types';

export async function getTransactions(): Promise<TransactionRecord[]> {
  const data = await db
    .select()
    .from(transactions)
    .orderBy(transactions.fecha);

  return data.map((record) => ({
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
}

export async function updateRecords(records: TransactionRecord[]): Promise<{ success: boolean; error?: string }> {
  try {
    await Promise.all(
      records.map(async (record) => {
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
      })
    );

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update records';
    console.error('Failed to update records:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
