'use server';

import { revalidatePath } from 'next/cache';

import { desc, eq, inArray } from 'drizzle-orm';

import { db } from '~/server/db';
import { transactions } from '~/server/db/schema';

import type { TransactionRecord } from '~/types';
import type { BroadcastMessage } from '~/types/broadcast';

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
    }));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to fetch transactions'
    );
  }
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
    broadcastUpdate('DELETE', ids);
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

function broadcastUpdate(
  type: BroadcastMessage['type'],
  data: TransactionRecord[] | string[]
): void {
  try {
    let baseUrl = process.env.NEXT_PUBLIC_URL_BASE ?? 'http://localhost:3000';
    if (!/^https?:\/\//.test(baseUrl)) {
      baseUrl = `http://${baseUrl}`;
    }
    const url = `${baseUrl.replace(/\/$/, '')}/api/broadcast`;
    // Fire and forget: no await
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    }).catch((error) => {
      console.error('Error broadcasting update:', error);
    });
  } catch (error) {
    console.error('Error broadcasting update:', error);
  }
}
