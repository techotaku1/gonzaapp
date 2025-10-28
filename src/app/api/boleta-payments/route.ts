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
    // createdByInitial, // <-- ya no se recibe del frontend
  } = body;

  if (
    !boletaReferencia ||
    !Array.isArray(placas) ||
    typeof totalPrecioNeto !== 'number'
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
    // Pasamos totalPrecioNeto como SQL literal (Drizzle acepta SQL | string | Placeholder)
    // y aseguramos que los demás campos sean strings.
    await db.insert(boletaPayments).values({
      boletaReferencia: String(boletaReferencia),
      placas: placas.join(','),
      totalPrecioNeto: sql`${totalPrecioNeto.toFixed(2)}`,
      createdByInitial: createdByInitial ?? null,
    });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al guardar boleta' },
      { status: 500 }
    );
  }
}
