import { NextRequest, NextResponse } from 'next/server';

import {
  addEmitidoPor,
  deleteEmitidoPor,
  getAllEmitidoPor,
  updateEmitidoPor,
} from '~/server/actions/tableGeneral';

export async function GET(_req: NextRequest) {
  try {
    const emitidoPor = await getAllEmitidoPor();

    // This data rarely changes, so we can cache it for longer periods
    return NextResponse.json(
      { emitidoPor },
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
      { emitidoPor: [], error: 'Error fetching emitidoPor' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { nombre, color } = (await req.json()) as {
      nombre: string;
      color?: string;
    };
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nombre requerido' },
        { status: 400 }
      );
    }
    const colorValue = typeof color === 'string' ? color : undefined;
    const result = await addEmitidoPor(nombre.trim(), colorValue);
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

export async function DELETE(req: Request) {
  try {
    const { nombre } = (await req.json()) as { nombre: string };
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nombre requerido' },
        { status: 400 }
      );
    }
    const result = await deleteEmitidoPor(nombre.trim());
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al eliminar emitidoPor' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { nombre, color } = (await req.json()) as {
      nombre: string;
      color?: string;
    };
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nombre requerido' },
        { status: 400 }
      );
    }
    const colorValue = typeof color === 'string' ? color : undefined;
    const result = await updateEmitidoPor(nombre.trim(), colorValue);
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al actualizar emitidoPor' },
      { status: 500 }
    );
  }
}
