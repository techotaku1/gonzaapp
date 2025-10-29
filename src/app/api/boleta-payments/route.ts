import { NextRequest, NextResponse } from 'next/server';

import { currentUser } from '@clerk/nextjs/server';
import { sql } from 'drizzle-orm';

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
      tramites: r.tramites ? r.tramites.split(',') : [], // <-- parsea tramites como array
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
    tramites, // <-- nuevo campo
    // createdByInitial, // <-- ya no se recibe del frontend
  } = body;

  if (
    !boletaReferencia ||
    !Array.isArray(placas) ||
    typeof totalPrecioNeto !== 'number'
    // tramites es opcional, pero si viene debe ser array
  ) {
    return NextResponse.json(
      { success: false, error: 'Datos requeridos' },
      { status: 400 }
    );
  }

  // Obtiene el usuario actual desde Clerk en el backend
  const clerkUser = await currentUser();
  const createdByInitial =
    clerkUser?.firstName && clerkUser?.lastName
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : (clerkUser?.firstName ?? clerkUser?.username ?? 'A');

  try {
    await db.insert(boletaPayments).values({
      boletaReferencia: String(boletaReferencia),
      placas: placas.join(','),
      totalPrecioNeto: sql`${totalPrecioNeto.toFixed(2)}`,
      createdByInitial: createdByInitial ?? null,
      tramites: Array.isArray(tramites) ? tramites.join(',') : null, // <-- guarda tramites como string
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al guardar boleta' },
      { status: 500 }
    );
  }
}
