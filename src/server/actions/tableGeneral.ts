'use server';

import { revalidateTag, unstable_cache } from 'next/cache';

import { randomUUID } from 'crypto';
import { desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '~/server/db';
import { asesores, transactions } from '~/server/db/schema';

import type { TransactionRecord } from '~/types';

// Utilidad para reintentos (igual que en tu otro proyecto)
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 5,
  initialDelay = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), 30000);
      });
      return (await Promise.race([operation(), timeoutPromise])) as T;
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Función original de lectura
async function _getTransactions(): Promise<TransactionRecord[]> {
  try {
    const results = await withRetry(() =>
      db.select().from(transactions).orderBy(desc(transactions.fecha))
    );
    return results.map((record) => ({
      ...record,
      fecha: new Date(record.fecha),
      boletasRegistradas: Number(record.boletasRegistradas),
      precioNeto: Number(record.precioNeto), // <-- aquí
      tarifaServicio: Number(record.tarifaServicio),
      impuesto4x1000: Number(record.impuesto4x1000),
      gananciaBruta: Number(record.gananciaBruta),
      cilindraje:
        record.cilindraje !== null && record.cilindraje !== undefined
          ? Number(record.cilindraje)
          : null,
      // Asegura que tipoVehiculo sea string o null
      tipoVehiculo:
        record.tipoVehiculo !== null && record.tipoVehiculo !== undefined
          ? String(record.tipoVehiculo)
          : null,
    }));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to fetch transactions'
    );
  }
}

// Versión cacheada usando unstable_cache y tag
export const getTransactions = unstable_cache(
  _getTransactions,
  ['transactions-list'],
  {
    tags: ['transactions'],
    revalidate: 60, // 1 minuto
  }
);

// Cache para búsqueda remota de transacciones
async function _searchTransactions(
  query: string
): Promise<TransactionRecord[]> {
  if (!query || query.trim() === '') return [];
  const q = `%${query}%`;
  const results = await db
    .select()
    .from(transactions)
    .where(
      sql`
        placa ILIKE ${q} OR
        nombre ILIKE ${q} OR
        numero_documento ILIKE ${q} OR
        emitido_por ILIKE ${q} OR
        tipo_documento ILIKE ${q} OR
        ciudad ILIKE ${q} OR
        asesor ILIKE ${q} OR
        novedad ILIKE ${q} OR
        tramite ILIKE ${q}
      `
    )
    .orderBy(desc(transactions.fecha));
  return results.map((record) => ({
    ...record,
    fecha: new Date(record.fecha),
    boletasRegistradas: Number(record.boletasRegistradas),
    precioNeto: Number(record.precioNeto),
    tarifaServicio: Number(record.tarifaServicio),
    impuesto4x1000: Number(record.impuesto4x1000),
    gananciaBruta: Number(record.gananciaBruta),
  }));
}

export const searchTransactions = unstable_cache(
  _searchTransactions,
  ['transactions-search'],
  { tags: ['transactions'], revalidate: 60 }
);

// Cache para asesores
async function _getAllAsesores(): Promise<string[]> {
  const results = await db.select().from(asesores);
  return results
    .map((row) => (typeof row.nombre === 'string' ? row.nombre.trim() : ''))
    .filter((a) => a.length > 0)
    .sort((a, b) => a.localeCompare(b, 'es'));
}

export const getAllAsesores = unstable_cache(
  _getAllAsesores,
  ['asesores-list'],
  { tags: ['asesores'], revalidate: 60 }
);

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
    revalidateTag('transactions'); // Solo revalida el tag de datos
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
