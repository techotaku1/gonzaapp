import { NextResponse } from 'next/server';

import { getTransactionsSummary } from '~/server/actions/tableGeneral';

export async function GET() {
  try {
    const summary = await getTransactionsSummary();
    return NextResponse.json(summary, { status: 200 });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Error fetching transactions summary' },
      { status: 500 }
    );
  }
}
