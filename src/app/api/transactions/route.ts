import { NextRequest, NextResponse } from 'next/server';

import { getTransactionsPaginated } from '~/server/actions/tableGeneral';

export async function GET(req: NextRequest) {
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