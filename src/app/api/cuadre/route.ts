import { NextResponse } from 'next/server';

import { getCuadreRecords } from '~/server/actions/cuadreActions';

export async function GET() {
  try {
    const data = await getCuadreRecords();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=10',
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Error fetching cuadre records' },
      { status: 500 }
    );
  }
}
