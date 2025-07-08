import { NextResponse } from 'next/server';

import { getAllEmitidoPorWithColors } from '~/server/actions/tableGeneral';

export async function GET() {
  try {
    const emitidoPorWithColors = await getAllEmitidoPorWithColors();
    return NextResponse.json({ emitidoPorWithColors }, { status: 200 });
  } catch (_error) {
    return NextResponse.json(
      { emitidoPorWithColors: [], error: 'Error fetching emitidoPor with colors' },
      { status: 500 }
    );
  }
}
