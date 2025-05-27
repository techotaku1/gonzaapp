'use server';

import { revalidatePath } from 'next/cache';

import { eq, desc, inArray } from 'drizzle-orm';

import { db } from '~/server/db';
import { transactions } from '~/server/db/schema';

import type { TransactionRecord } from '~/types';

export async function getTransactions(): Promise<TransactionRecord[]> {
  try {
    const results = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.fecha)); // Ordenar por fecha descendente

    return results.map((record) => ({
      ...record,
      fecha: new Date(record.fecha),
      boletasRegistradas: Number(record.boletasRegistradas),
      precioNeto: Number(record.precioNeto),
      tarifaServicio: Number(record.tarifaServicio),
      impuesto4x1000: Number(record.impuesto4x1000),
      gananciaBruta: Number(record.gananciaBruta),
    }));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch transactions';
    throw new Error(errorMessage);
  }
}

export async function createRecord(
  record: TransactionRecord // Cambiar para aceptar el ID
): Promise<{ success: boolean; error?: string }> {
  try {
    const newRecord = {
      id: record.id, // Usar el ID proporcionado
      fecha: new Date(record.fecha),
      tramite: record.tramite,
      pagado: record.pagado,
      boleta: record.boleta,
      boletasRegistradas: record.boletasRegistradas.toString(),
      emitidoPor: record.emitidoPor,
      placa: record.placa,
      tipoDocumento: record.tipoDocumento,
      numeroDocumento: record.numeroDocumento,
      nombre: record.nombre,
      cilindraje: record.cilindraje ?? null,
      tipoVehiculo: record.tipoVehiculo ?? null,
      celular: record.celular ?? null,
      ciudad: record.ciudad,
      asesor: record.asesor,
      novedad: record.novedad ?? null,
      precioNeto: record.precioNeto.toString(),
      comisionExtra: record.comisionExtra,
      tarifaServicio: record.tarifaServicio.toString(),
      impuesto4x1000: record.impuesto4x1000.toString(),
      gananciaBruta: record.gananciaBruta.toString(),
      rappi: record.rappi,
      observaciones: record.observaciones ?? null,
    };

    await db.insert(transactions).values(newRecord);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error creating record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create record',
    };
  }
}

export async function updateRecords(
  records: TransactionRecord[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await Promise.all(
      records.map(async (record) => {
        const updateData = {
          fecha: new Date(record.fecha), // Convertir a Date antes de guardar
          tramite: record.tramite,
          pagado: record.pagado,
          boleta: record.boleta,
          boletasRegistradas: record.boletasRegistradas.toString(),
          emitidoPor: record.emitidoPor,
          placa: record.placa,
          tipoDocumento: record.tipoDocumento,
          numeroDocumento: record.numeroDocumento,
          nombre: record.nombre,
          cilindraje: record.cilindraje ?? null,
          tipoVehiculo: record.tipoVehiculo ?? null,
          celular: record.celular ?? null,
          ciudad: record.ciudad,
          asesor: record.asesor,
          novedad: record.novedad ?? null,
          precioNeto: record.precioNeto.toString(),
          comisionExtra: record.comisionExtra,
          tarifaServicio: record.tarifaServicio.toString(),
          impuesto4x1000: record.impuesto4x1000.toString(),
          gananciaBruta: record.gananciaBruta.toString(),
          rappi: record.rappi,
          observaciones: record.observaciones ?? null,
        };

        await db
          .update(transactions)
          .set(updateData)
          .where(eq(transactions.id, record.id));
      })
    );

    // Solo revalidar el path, no recargar la página
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating records:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update records',
    };
  }
}

export async function deleteRecords(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(transactions).where(inArray(transactions.id, ids));
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting records:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete records',
    };
  }
}
