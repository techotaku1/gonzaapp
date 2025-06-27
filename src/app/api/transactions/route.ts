import { NextRequest, NextResponse } from 'next/server';

import { desc, sql } from 'drizzle-orm';

import { db } from '~/server/db';
import { transactions } from '~/server/db/schema';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const date = searchParams.get('date'); // YYYY-MM-DD
    const limit = Number(searchParams.get('limit') ?? 50);
    const offset = Number(searchParams.get('offset') ?? 0);

    // Solo columnas necesarias (usar objeto, no array)
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
      boletasRegistradas: transactions.boletasRegistradas,
      tipoDocumento: transactions.tipoDocumento,
      numeroDocumento: transactions.numeroDocumento,
      novedad: transactions.novedad,
      comisionExtra: transactions.comisionExtra,
      rappi: transactions.rappi,
      observaciones: transactions.observaciones,
    };

    // Validar que la fecha esté presente y en formato correcto
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Debe enviar el parámetro date=YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Filtro por fecha exacta (solo ese día)
    const where = sql`DATE(${transactions.fecha}) = ${date}`;

    // Consulta paginada solo para ese día
    const data = await db
      .select(columns)
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.fecha))
      .limit(limit)
      .offset(offset);

    // Validar que todos los registros devueltos sean solo de ese día
    const allSameDay =
      data.length === 0 ||
      data.every((row) => {
        const fecha: unknown = row.fecha;
        if (typeof fecha === 'string') {
          // Solo ejecuta slice si es string
          return fecha.slice(0, 10) === date;
        }
        if (fecha instanceof Date) {
          return fecha.toISOString().slice(0, 10) === date;
        }
        return false;
      });
    if (!allSameDay) {
      return NextResponse.json(
        { error: 'La consulta devolvió registros de más de un día.' },
        { status: 500 }
      );
    }

    // Total para la paginación de ese día
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(where);

    // Cache-Control: 1 minuto en edge, 10 seg en browser
    return NextResponse.json(
      { data, total: Number(count) },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=10',
        },
      }
    );
  } catch (_error) {
    return NextResponse.json(
      { error: 'Error fetching transactions' },
      { status: 500 }
    );
  }
}
