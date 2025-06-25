import { NextResponse } from 'next/server';

import { addAsesor, getAllAsesores } from '~/server/actions/tableGeneral';

export async function GET() {
  try {
    const asesores = await getAllAsesores();
    return NextResponse.json({ asesores });
  } catch (_error) {
    return NextResponse.json(
      { asesores: [], error: 'Error fetching asesores' },
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
    const result = await addAsesor(nombre);
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al agregar asesor' },
      { status: 500 }
    );
  }
}
