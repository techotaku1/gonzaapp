import { NextRequest, NextResponse } from 'next/server';

import { getAllEmitidoPorWithColors } from '~/server/actions/tableGeneral';

export async function GET(_req: NextRequest) {
  try {
    const emitidoPorWithColors = await getAllEmitidoPorWithColors();

    // This data rarely changes, so we can cache it for longer periods
    return NextResponse.json(
      { emitidoPorWithColors },
      {
        status: 200,
        headers: {
          // Cache for 5 minutes on CDN, allow reuse for up to 1 hour while revalidating
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
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
