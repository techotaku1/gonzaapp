'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { db } from '~/server/db';
import { cuadre } from '~/server/db/schema';

import type { CuadreData, CuadreRecord } from '~/types';

export async function createCuadreRecord(
  data: Omit<CuadreRecord, 'id' | 'createdAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = crypto.randomUUID();
    await db.insert(cuadre).values({
      ...data,
      id,
    });
    revalidatePath('/cuadre');
    return { success: true };
  } catch (error) {
    console.error('Error creating cuadre record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create record',
    };
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
        banco: data.banco || '',
        banco2: data.banco2 || '',
        fechaCliente: data.fechaCliente,
        referencia: data.referencia || '',
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

export async function getCuadreRecords(): Promise<CuadreRecord[]> {
  try {
    const results = await db.select().from(cuadre);
    return results.map((record) => ({
      ...record,
      fechaCliente: record.fechaCliente ? new Date(record.fechaCliente) : null,
      createdAt: new Date(record.createdAt),
    }));
  } catch (error) {
    console.error('Error fetching cuadre records:', error);
    throw new Error('Failed to fetch cuadre records');
  }
}

export async function getCuadreRecord(
  id: string
): Promise<CuadreRecord | null> {
  try {
    const result = await db
      .select()
      .from(cuadre)
      .where(eq(cuadre.id, id))
      .limit(1);
    if (!result[0]) return null;

    return {
      ...result[0],
      fechaCliente: result[0].fechaCliente
        ? new Date(result[0].fechaCliente)
        : null,
      createdAt: new Date(result[0].createdAt),
    };
  } catch (error) {
    console.error('Error fetching cuadre record:', error);
    throw new Error('Failed to fetch cuadre record');
  }
}
