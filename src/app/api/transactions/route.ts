import { NextResponse } from 'next/server';

import { getTransactions } from '~/server/actions/tableGeneral';

export async function GET() {
  try {
    const data = await getTransactions();
    return NextResponse.json(data);
  } catch (_error) {
    return NextResponse.json({ error: 'Error fetching transactions' }, { status: 500 });
  }
}
