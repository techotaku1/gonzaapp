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
  const body = await req.json();
  const {
    boletaReferencia,
    placas,
    totalPrecioNeto,
    createdByInitial, // <-- nombre del usuario logueado
  } = body;

  if (
    !boletaReferencia ||
    !Array.isArray(placas) ||
    typeof totalPrecioNeto !== 'number' ||
    !createdByInitial
  ) {
    return NextResponse.json(
      { success: false, error: 'Datos requeridos' },
      { status: 400 }
    );
  }

  try {
    await db.insert(boletaPayments).values({
      boletaReferencia,
      placas: placas.join(','),
      totalPrecioNeto,
      createdByInitial, // <-- guarda el nombre aquí
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al guardar boleta' },
      { status: 500 }
    );
  }
}
