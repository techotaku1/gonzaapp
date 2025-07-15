import { NextRequest, NextResponse } from 'next/server';

import {
  addTramite,
  deleteTramite,
  getAllTramites,
  updateTramite,
} from '~/server/actions/tableGeneral';

export async function GET(_req: NextRequest) {
  try {
    const tramites = await getAllTramites();

    // This data rarely changes, so we can cache it for longer periods
    return NextResponse.json(
      { tramites },
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
      { tramites: [], error: 'Error fetching tramites' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { nombre, color } = await req.json();
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nombre requerido' },
        { status: 400 }
      );
    }
    const colorValue = typeof color === 'string' ? color : undefined;
    const result = await addTramite(nombre.trim(), colorValue);
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

export async function DELETE(req: Request) {
  try {
    const { nombre } = await req.json();
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nombre requerido' },
        { status: 400 }
      );
    }
    const result = await deleteTramite(nombre.trim());
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al eliminar tramite' },
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
    const result = await updateTramite(nombre.trim(), colorValue);
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Error al actualizar tramite' },
      { status: 500 }
    );
  }
}
