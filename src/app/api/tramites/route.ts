import { NextResponse } from 'next/server';

import { addTramite, getAllTramites } from '~/server/actions/tableGeneral';

export async function GET() {
  try {
    const tramites = await getAllTramites();
    return NextResponse.json({ tramites }, { status: 200 });
  } catch (_error) {
    return NextResponse.json(
      { tramites: [], error: 'Error fetching tramites' },
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
    const result = await addTramite(nombre);
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al agregar tramite' },
      { status: 500 }
    );
  }
}
