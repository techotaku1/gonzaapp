import { NextRequest, NextResponse } from 'next/server';

import { addNovedad, getAllNovedades } from '~/server/actions/tableGeneral';

export async function GET(_req: NextRequest) {
  try {
    const novedades = await getAllNovedades();

    // This data rarely changes, so we can cache it for longer periods
    return NextResponse.json(
      { novedades },
      {
        status: 200,
        headers: {
          // Cache for 5 minutes on CDN, allow reuse for up to 1 hour while revalidating
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
  } catch (_error) {
    return NextResponse.json(
      { novedades: [], error: 'Error fetching novedades' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { nombre } = await req.json();
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nombre requerido' },
        { status: 400 }
      );
    }
    const result = await addNovedad(nombre);
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al agregar novedad' },
      { status: 500 }
    );
  }
}
