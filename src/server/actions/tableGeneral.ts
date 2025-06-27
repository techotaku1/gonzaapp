'use server';

import { revalidateTag, unstable_cache } from 'next/cache';

import { randomUUID } from 'crypto';
import { desc, eq, inArray, sql as _sql } from 'drizzle-orm';

import { db } from '~/server/db';
import { asesores, transactions } from '~/server/db/schema';

import type { TransactionRecord } from '~/types';

// Función original de lectura
export async function getTransactions(): Promise<TransactionRecord[]> {
  try {
    const results = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.fecha));
    return results.map((record) => ({
      ...record,
      fecha: new Date(record.fecha),
      boletasRegistradas: Number(record.boletasRegistradas),
      precioNeto: Number(record.precioNeto),
      tarifaServicio: Number(record.tarifaServicio),
      impuesto4x1000: Number(record.impuesto4x1000),
      gananciaBruta: Number(record.gananciaBruta),
      cilindraje:
        record.cilindraje !== null && record.cilindraje !== undefined
          ? Number(record.cilindraje)
          : null,
      tipoVehiculo:
        record.tipoVehiculo !== null && record.tipoVehiculo !== undefined
          ? String(record.tipoVehiculo)
          : null,
      celular:
        record.celular !== null && record.celular !== undefined
          ? String(record.celular)
          : null,
    }));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to fetch transactions'
    );
  }
}

// Función cacheada para paginación (solo para el API Route)
export const getTransactionsPaginated = unstable_cache(
  async (date: string, limit: number, offset: number) => {
    // Consulta paginada solo para ese día
    const columns = {
      id: transactions.id,
      fecha: transactions.fecha,
      placa: transactions.placa,
      nombre: transactions.nombre,
      ciudad: transactions.ciudad,
      asesor: transactions.asesor,
      tramite: transactions.tramite,
      emitidoPor: transactions.emitidoPor,
      precioNeto: transactions.precioNeto,
      tarifaServicio: transactions.tarifaServicio,
      impuesto4x1000: transactions.impuesto4x1000,
      gananciaBruta: transactions.gananciaBruta,
      pagado: transactions.pagado,
      boleta: transactions.boleta,
      boletasRegistradas: transactions.boletasRegistradas,
      tipoDocumento: transactions.tipoDocumento,
      numeroDocumento: transactions.numeroDocumento,
      novedad: transactions.novedad,
      comisionExtra: transactions.comisionExtra,
      rappi: transactions.rappi,
      observaciones: transactions.observaciones,
      cilindraje: transactions.cilindraje,
      tipoVehiculo: transactions.tipoVehiculo,
      celular: transactions.celular,
    };
    const where = _sql`DATE(${transactions.fecha}) = ${date}`;
    const data = await db
      .select(columns)
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.fecha))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: _sql<number>`COUNT(*)` })
      .from(transactions)
      .where(where);

    // Normaliza tipos
    const dataFixed = data.map((row) => ({
      ...row,
      fecha: new Date(row.fecha),
      boletasRegistradas: Number(row.boletasRegistradas),
      precioNeto: Number(row.precioNeto),
      tarifaServicio: Number(row.tarifaServicio),
      impuesto4x1000: Number(row.impuesto4x1000),
      gananciaBruta: Number(row.gananciaBruta),
      cilindraje:
        typeof row.cilindraje !== 'undefined' && row.cilindraje !== null
          ? Number(row.cilindraje)
          : null,
      tipoVehiculo:
        typeof row.tipoVehiculo !== 'undefined' && row.tipoVehiculo !== null
          ? String(row.tipoVehiculo)
          : null,
      celular:
        typeof row.celular !== 'undefined' && row.celular !== null
          ? String(row.celular)
          : null,
    }));

    return { data: dataFixed, total: Number(count) };
  },
  ['transactions-paginated'],
  { tags: ['transactions'], revalidate: 60 }
);

// Cache para búsqueda remota de transacciones
async function _searchTransactions(
  query: string
): Promise<TransactionRecord[]> {
  if (!query || query.trim() === '') return [];
  // Agrega un await para cumplir con la regla require-await
  await Promise.resolve();
  // ...puedes agregar lógica real aquí si lo necesitas...
  return [];
}

// No uses unstable_cache aquí, solo exporta la función async
export async function searchTransactions(
  query: string
): Promise<TransactionRecord[]> {
  return await _searchTransactions(query);
}

// Cache para asesores
async function _getAllAsesores(): Promise<string[]> {
  const results = await db.select().from(asesores);
  return results
    .map((row) => (typeof row.nombre === 'string' ? row.nombre.trim() : ''))
    .filter((a) => a.length > 0)
    .sort((a, b) => a.localeCompare(b, 'es'));
}

// No uses unstable_cache aquí, solo exporta la función async
export async function getAllAsesores(): Promise<string[]> {
  return await _getAllAsesores();
}

export async function createRecord(
  record: TransactionRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(transactions).values({
      ...record,
      boletasRegistradas: Number(record.boletasRegistradas).toString(),
      precioNeto: record.precioNeto.toString(),
      tarifaServicio: record.tarifaServicio.toString(),
      impuesto4x1000: record.impuesto4x1000.toString(),
      gananciaBruta: record.gananciaBruta.toString(),
    });
    revalidateTag('transactions');
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
        const safeRecord = {
          ...record,
          ciudad: record.ciudad || '',
          nombre: record.nombre || '',
          tramite: record.tramite || '',
          emitidoPor: record.emitidoPor || '',
          tipoDocumento: record.tipoDocumento || '',
          numeroDocumento: record.numeroDocumento || '',
          asesor: record.asesor || '',
          fecha:
            record.fecha instanceof Date
              ? record.fecha
              : new Date(record.fecha),
        };
        await db
          .update(transactions)
          .set({
            ...safeRecord,
            boletasRegistradas: Number(
              safeRecord.boletasRegistradas
            ).toString(),
            precioNeto: safeRecord.precioNeto.toString(),
            tarifaServicio: safeRecord.tarifaServicio.toString(),
            impuesto4x1000: safeRecord.impuesto4x1000.toString(),
            gananciaBruta: safeRecord.gananciaBruta.toString(),
          })
          .where(eq(transactions.id, record.id));
      })
    );
    revalidateTag('transactions'); // Revalida solo el tag de datos
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
    revalidateTag('transactions'); // Solo revalida el tag de datos
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

export async function addAsesor(
  nombre: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(asesores).values({
      id: randomUUID(),
      nombre: nombre.trim(),
    });
    revalidateTag('asesores'); // Invalida solo el cache de asesores
    return { success: true };
  } catch (error) {
    console.error('Error adding asesor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add asesor',
    };
  }
}
