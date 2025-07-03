import { NextResponse } from 'next/server';

import { addNovedad, getAllNovedades } from '~/server/actions/tableGeneral';

export async function GET() {
  try {
    const novedades = await getAllNovedades();
    return NextResponse.json({ novedades }, { status: 200 });
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
