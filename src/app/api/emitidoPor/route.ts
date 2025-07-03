import { NextResponse } from 'next/server';

import { addEmitidoPor, getAllEmitidoPor } from '~/server/actions/tableGeneral';

export async function GET() {
  try {
    const emitidoPor = await getAllEmitidoPor();
    return NextResponse.json({ emitidoPor }, { status: 200 });
  } catch (_error) {
    return NextResponse.json(
      { emitidoPor: [], error: 'Error fetching emitidoPor' },
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
    const result = await addEmitidoPor(nombre);
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al agregar emitidoPor' },
      { status: 500 }
    );
  }
}
