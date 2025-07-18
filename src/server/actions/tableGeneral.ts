'use server';

import { revalidateTag, unstable_cache } from 'next/cache';

import crypto, { randomUUID } from 'crypto';
import { desc, eq, inArray, sql as _sql } from 'drizzle-orm';

import { db } from '~/server/db';
import {
  asesores,
  colores,
  emitidoPor,
  novedades,
  tramites,
  transactions,
} from '~/server/db/schema';

import type { ColorRecord, TramiteRecord, TransactionRecord } from '~/types';

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
  // Limita el número de resultados y columnas para ahorrar egress
  const search = query.trim().toLowerCase();
  const results = await db
    .select({
      id: transactions.id,
      fecha: transactions.fecha,
      tramite: transactions.tramite,
      pagado: transactions.pagado,
      boleta: transactions.boleta, // <-- Añadir este campo
      boletasRegistradas: transactions.boletasRegistradas,
      emitidoPor: transactions.emitidoPor,
      placa: transactions.placa,
      tipoDocumento: transactions.tipoDocumento,
      numeroDocumento: transactions.numeroDocumento,
      nombre: transactions.nombre,
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
      cilindraje: transactions.cilindraje,
      tipoVehiculo: transactions.tipoVehiculo,
      celular: transactions.celular,
    })
    .from(transactions)
    .where(
      _sql`
        LOWER(${transactions.placa}) LIKE ${'%' + search + '%'}
        OR LOWER(${transactions.nombre}) LIKE ${'%' + search + '%'}
        OR LOWER(${transactions.numeroDocumento}) LIKE ${'%' + search + '%'}
        OR LOWER(${transactions.ciudad}) LIKE ${'%' + search + '%'}
      `
    )
    .orderBy(desc(transactions.fecha))
    .limit(30); // Limita a 30 resultados

  // Normaliza tipos
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
    boleta: record.boleta, // <-- Asegura que boleta esté presente
  }));
}

// No uses unstable_cache aquí, solo exporta la función async
export async function searchTransactions(
  query: string
): Promise<TransactionRecord[]> {
  return await _searchTransactions(query);
}

// Elimina el cache para asesores, solo consulta directo
export async function getAllAsesores(): Promise<string[]> {
  const results = await db.select().from(asesores);
  return results
    .map((row) => (typeof row.nombre === 'string' ? row.nombre.trim() : ''))
    .filter((a) => a.length > 0)
    .sort((a, b) => a.localeCompare(b, 'es'));
}

export async function createRecord(
  record: TransactionRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    // --- Guarda la fecha tal como la recibe ---
    await db.insert(transactions).values({
      ...record,
      fecha: record.fecha,
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

// Nuevo: función para obtener solo ids y hash/checksum
export async function getTransactionsSummary(): Promise<
  { id: string; hash: string }[]
> {
  const results = await db
    .select({
      id: transactions.id,
      // Selecciona cada campo individualmente, no como array
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
    })
    .from(transactions);

  // Calcula un hash simple de los campos relevantes
  return results.map((row) => {
    // Solo usa los campos relevantes para el hash
    const { id, ...fields } = row;
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(fields))
      .digest('hex');
    return { id: String(id), hash };
  });
}

export async function updateRecords(
  records: TransactionRecord[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await Promise.all(
      records.map(async (record) => {
        if (!record.id || typeof record.id !== 'string') return;
        const fieldsToUpdate: Record<string, unknown> = {};
        Object.keys(record).forEach((key) => {
          if (key === 'id') return;
          let val = record[key as keyof TransactionRecord];
          // Normaliza fecha: solo convierte si es string o number, nunca boolean
          if (key === 'fecha') {
            if (
              val &&
              (typeof val === 'string' ||
                typeof val === 'number' ||
                val instanceof Date)
            ) {
              if (!(val instanceof Date)) {
                val = new Date(val);
              }
              if (!(val instanceof Date) || isNaN(val.getTime())) {
                val = null;
              }
            } else {
              val = null;
            }
          }
          // Corrige campos string NOT NULL: nunca null/undefined, siempre string
          // Ajusta aquí según tu schema real
          const notNullStringFields = [
            'tramite',
            'emitidoPor',
            'placa',
            'tipoDocumento',
            'numeroDocumento',
            'nombre',
            'ciudad',
            'asesor',
          ];
          if (notNullStringFields.includes(key)) {
            val ??= '';
          }
          if (val !== undefined) fieldsToUpdate[key] = val;
        });
        if (Object.keys(fieldsToUpdate).length === 0) return;
        await db
          .update(transactions)
          .set(fieldsToUpdate)
          .where(eq(transactions.id, record.id));
      })
    );
    revalidateTag('transactions');
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
    // Manejo específico para error de duplicado (Postgres code 23505)
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      String((error as { code?: unknown }).code) === '23505'
    ) {
      return {
        success: false,
        error: 'El asesor ya existe.',
      };
    }
    console.error('Error adding asesor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add asesor',
    };
  }
}

// Nuevo: obtener registros completos por ids
export async function getTransactionsByIds(
  ids: string[]
): Promise<TransactionRecord[]> {
  if (!ids.length) return [];
  const results = await db
    .select()
    .from(transactions)
    .where(inArray(transactions.id, ids));
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
}

// Nuevas funciones para tramites, novedades y emitidoPor
export async function getAllTramites(): Promise<TramiteRecord[]> {
  const results = await db.select().from(tramites);
  return results
    .map((row) => ({
      id: row.id,
      nombre: typeof row.nombre === 'string' ? row.nombre.trim() : '',
      color: row.color ?? undefined, // Cambiar || por ??
    }))
    .filter((a) => a.nombre.length > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function addTramite(
  nombre: string,
  color?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(tramites).values({
      id: randomUUID(),
      nombre: nombre.trim(),
      color: color ?? null, // Cambiar || por ??
    });
    revalidateTag('tramites');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add tramite',
    };
  }
}

export async function getAllNovedades(): Promise<string[]> {
  const results = await db.select().from(novedades);
  return results
    .map((row) => (typeof row.nombre === 'string' ? row.nombre.trim() : ''))
    .filter((a) => a.length > 0)
    .sort((a, b) => a.localeCompare(b, 'es'));
}

export async function addNovedad(
  nombre: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(novedades).values({
      id: randomUUID(),
      nombre: nombre.trim(),
    });
    revalidateTag('novedades');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add novedad',
    };
  }
}

export async function getAllEmitidoPor(): Promise<string[]> {
  const results = await db.select().from(emitidoPor);
  return results
    .map((row) => (typeof row.nombre === 'string' ? row.nombre.trim() : ''))
    .filter((a) => a.length > 0)
    .sort((a, b) => a.localeCompare(b, 'es'));
}

// Nueva función para obtener emitidoPor con colores
export async function getAllEmitidoPorWithColors(): Promise<
  { nombre: string; color?: string }[]
> {
  const results = await db.select().from(emitidoPor);
  return results
    .map((row) => ({
      nombre: typeof row.nombre === 'string' ? row.nombre.trim() : '',
      color: row.color ?? undefined,
    }))
    .filter((a) => a.nombre.length > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function deleteTramite(
  nombre: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(tramites).where(eq(tramites.nombre, nombre));
    revalidateTag('tramites');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete tramite',
    };
  }
}

export async function deleteEmitidoPor(
  nombre: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(emitidoPor).where(eq(emitidoPor.nombre, nombre));
    revalidateTag('emitidoPor');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete emitidoPor',
    };
  }
}

// Nuevas funciones para colores
export async function getAllColores(): Promise<ColorRecord[]> {
  const results = await db.select().from(colores);
  return results
    .map((row) => ({
      id: row.id,
      nombre: typeof row.nombre === 'string' ? row.nombre.trim() : '',
      valor: typeof row.valor === 'string' ? row.valor.trim() : '',
      intensidad: typeof row.intensidad === 'number' ? row.intensidad : 400,
    }))
    .filter((a) => a.nombre.length > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function addColor(
  nombre: string,
  valor: string,
  intensidad = 500 // Cambiar de 400 a 500
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(colores).values({
      id: randomUUID(),
      nombre: nombre.trim(),
      valor: valor.trim(),
      intensidad,
    });
    revalidateTag('colores');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add color',
    };
  }
}

export async function addEmitidoPor(
  nombre: string,
  color?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(emitidoPor).values({
      id: randomUUID(),
      nombre: nombre.trim(),
      color: color ?? null,
    });
    revalidateTag('emitidoPor');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to add emitidoPor',
    };
  }
}

// Nueva función para actualizar el color de un emitidoPor existente
export async function updateEmitidoPor(
  nombre: string,
  color?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(emitidoPor)
      .set({ color: color ?? null })
      .where(eq(emitidoPor.nombre, nombre));
    revalidateTag('emitidoPor');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update emitidoPor',
    };
  }
}

// Nueva función para actualizar el color de un trámite existente
export async function updateTramite(
  nombre: string,
  color?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(tramites)
      .set({ color: color ?? null })
      .where(eq(tramites.nombre, nombre));
    revalidateTag('tramites');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update tramite',
    };
  }
}
