'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { db } from '~/server/db';
import { cuadre, transactions } from '~/server/db/schema';

import type { CuadreData, ExtendedSummaryRecord } from '~/types';

export async function getCuadreRecords(): Promise<ExtendedSummaryRecord[]> {
  try {
    const results = await db
      .select({
        id: transactions.id,
        fecha: transactions.fecha,
        tramite: transactions.tramite,
        pagado: transactions.pagado,
        boleta: transactions.boleta,
        boletasRegistradas: transactions.boletasRegistradas,
        emitidoPor: transactions.emitidoPor,
        placa: transactions.placa,
        tipoDocumento: transactions.tipoDocumento,
        numeroDocumento: transactions.numeroDocumento,
        nombre: transactions.nombre,
        cilindraje: transactions.cilindraje,
        tipoVehiculo: transactions.tipoVehiculo,
        celular: transactions.celular,
        ciudad: transactions.ciudad,
        asesor: transactions.asesor,
        novedad: transactions.novedad,
        precioNeto: transactions.precioNeto,
        comisionExtra: transactions.comisionExtra,
        tarifaServicio: transactions.tarifaServicio,
        impuesto4x1000: transactions.impuesto4x1000,
        gananciaBruta: transactions.gananciaBruta,
        rappi: transactions.rappi,
        observaciones: transactions.observaciones,
        banco: cuadre.banco,
        banco2: cuadre.banco2,
        fechaCliente: cuadre.fechaCliente,
        referencia: cuadre.referencia,
        createdAt: cuadre.createdAt,
      })
      .from(transactions)
      .innerJoin(cuadre, eq(cuadre.transactionId, transactions.id));

    return results.map((record) => ({
      ...record,
      fecha: new Date(record.fecha),
      fechaCliente: record.fechaCliente ? new Date(record.fechaCliente) : null,
      createdAt: new Date(record.createdAt ?? Date.now()),
      boletasRegistradas: Number(record.boletasRegistradas),
      precioNeto: Number(record.precioNeto),
      tarifaServicio: Number(record.tarifaServicio),
      impuesto4x1000: Number(record.impuesto4x1000),
      gananciaBruta: Number(record.gananciaBruta),
      banco: record.banco ?? '',
      banco2: record.banco2 ?? '',
      referencia: record.referencia ?? '',
      totalCombinado: Number(record.precioNeto) + Number(record.tarifaServicio),
    }));
  } catch (error) {
    console.error('Error fetching cuadre records:', error);
    throw error;
  }
}

export async function updateCuadreRecord(
  transactionId: string,
  data: CuadreData
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(cuadre)
      .set({
        banco: data.banco ?? '',
        banco2: data.banco2 ?? '',
        fechaCliente: data.fechaCliente,
        referencia: data.referencia ?? '',
      })
      .where(eq(cuadre.transactionId, transactionId));

    revalidatePath('/cuadre');
    return { success: true };
  } catch (error) {
    console.error('Error updating cuadre record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update record',
    };
  }
}

export async function createCuadreRecord(
  transactionId: string,
  data: CuadreData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validar fechas y strings
    const safeData = {
      ...data,
      banco: data.banco || '',
      banco2: data.banco2 || '',
      referencia: data.referencia || '',
      fechaCliente:
        data.fechaCliente instanceof Date || data.fechaCliente === null
          ? data.fechaCliente
          : data.fechaCliente
            ? new Date(data.fechaCliente)
            : null,
    };
    await db.insert(cuadre).values({
      id: crypto.randomUUID(),
      transactionId,
      ...safeData,
      createdAt: new Date(),
    });

    revalidatePath('/cuadre');
    return { success: true };
  } catch (error) {
    console.error('Error creating cuadre record:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create cuadre record',
    };
  }
}
