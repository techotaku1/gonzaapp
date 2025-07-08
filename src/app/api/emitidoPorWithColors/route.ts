import { NextResponse } from 'next/server';

import { getAllEmitidoPorWithColors } from '~/server/actions/tableGeneral';

export async function GET() {
  try {
    const emitidoPorWithColors = await getAllEmitidoPorWithColors();
    console.log('API emitidoPorWithColors response:', emitidoPorWithColors); // DEBUG
    return NextResponse.json({ emitidoPorWithColors }, { status: 200 });
  } catch (error) {
    console.error('Error fetching emitidoPorWithColors:', error);
    return NextResponse.json(
      {
        emitidoPorWithColors: [],
        error: 'Error fetching emitidoPorWithColors',
      },
      { status: 500 }
    );
  }
}
