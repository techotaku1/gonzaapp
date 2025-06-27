import { NextRequest, NextResponse } from 'next/server';

import { desc, sql } from 'drizzle-orm';

import { db } from '~/server/db';
import { transactions } from '~/server/db/schema';

// Define un tipo para los resultados de la consulta
interface RawTransaction {
  id: string;
  fecha: string | Date;
  placa: string;
  nombre: string;
  ciudad: string;
  asesor: string;
  tramite: string;
  emitidoPor: string;
  precioNeto: string | number;
  tarifaServicio: string | number;
  impuesto4x1000: string | number;
  gananciaBruta: string | number;
  pagado: boolean;
  boleta: boolean;
  boletasRegistradas: string | number;
  tipoDocumento: string;
  numeroDocumento: string;
  novedad: string | null;
  comisionExtra: boolean;
  rappi: boolean;
  observaciones: string | null;
  cilindraje: string | number | null;
  tipoVehiculo: string | null;
  celular: string | null;
}

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

    // --- SOLUCIÓN: CONVIERTE CAMPOS NUMÉRICOS ANTES DE ENVIAR AL FRONT ---
    const dataFixed = (data as RawTransaction[]).map((row) => ({
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


    return NextResponse.json(
      { data: dataFixed, total: Number(count) },
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
