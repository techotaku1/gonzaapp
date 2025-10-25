import { NextRequest, NextResponse } from 'next/server';

import { db } from '~/server/db';
import { boletaPayments } from '~/server/db/schema';

export async function GET() {
  try {
    const results = await db
      .select()
      .from(boletaPayments)
      .orderBy(boletaPayments.fecha);
    const parsedResults = results.map((r) => ({
      ...r,
      placas: r.placas.split(','),
    }));
    return NextResponse.json({ boletaPayments: parsedResults });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Error fetching boleta payments' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { boletaReferencia, placas, totalPrecioNeto, createdByInitial } =
      await req.json();
    if (!boletaReferencia || !placas || totalPrecioNeto == null) {
      return NextResponse.json(
        { success: false, error: 'Datos requeridos faltantes' },
        { status: 400 }
      );
    }
    await db.insert(boletaPayments).values({
      boletaReferencia,
      placas: Array.isArray(placas) ? placas.join(',') : placas,
      totalPrecioNeto,
      createdByInitial,
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al crear boleta payment' },
      { status: 500 }
    );
  }
}
