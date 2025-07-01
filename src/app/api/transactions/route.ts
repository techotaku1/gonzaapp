import { NextRequest, NextResponse } from 'next/server';

import {
  getTransactionsByIds, // <-- nuevo import
  getTransactionsPaginated,
  getTransactionsSummary,
} from '~/server/actions/tableGeneral';

// Nuevo endpoint: /api/transactions/summary
export async function GET(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.endsWith('/summary')) {
    try {
      const summary = await getTransactionsSummary();
      return NextResponse.json(summary, { status: 200 });
    } catch (_error) {
      return NextResponse.json(
        { error: 'Error fetching transactions summary' },
        { status: 500 }
      );
    }
  }

  try {
    const { searchParams } = req.nextUrl;
    const date = searchParams.get('date'); // YYYY-MM-DD
    const limit = Number(searchParams.get('limit') ?? 100);
    const offset = Number(searchParams.get('offset') ?? 0);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Debe enviar el parámetro date=YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Usa la función cacheada para paginación
    const result = await getTransactionsPaginated(date, limit, offset);

    // Asegura que result tenga data y total
    return NextResponse.json(
      { data: result?.data ?? [], total: result?.total ?? 0 },
      { status: 200 }
    );
  } catch (_error) {
    return NextResponse.json(
      { error: 'Error fetching transactions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.endsWith('/by-ids')) {
    try {
      const { ids } = await req.json();
      // Asegura que ids es string[]
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json([], { status: 200 });
      }
      // Forzar a string[]
      const safeIds: string[] = ids.filter(
        (id): id is string => typeof id === 'string'
      );
      const records = await getTransactionsByIds(safeIds);
      return NextResponse.json(records, { status: 200 });
    } catch (_error) {
      return NextResponse.json(
        { error: 'Error fetching transactions by ids' },
        { status: 500 }
      );
    }
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
