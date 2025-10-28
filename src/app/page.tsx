'use cache';

import { sql } from 'drizzle-orm';

import Header from '~/components/Header';
import { SWRProvider } from '~/components/swr/SWRProvider';
import TransactionTableClient from '~/components/transacciones/TransactionTableClient';
import {
  getTransactionsPaginated,
  updateRecords,
} from '~/server/actions/tableGeneral';
import { db } from '~/server/db';
import { transactions } from '~/server/db/schema';

export default async function HomePage() {
  // Obtiene el último día con registros
  const lastDateResult = await db
    .select({ maxFecha: sql`MAX(${transactions.fecha})` })
    .from(transactions);
  const lastDateRaw = lastDateResult[0]?.maxFecha as Date | undefined;
  const lastDate =
    lastDateRaw && lastDateRaw instanceof Date ? lastDateRaw : undefined;

  let dateStr: string;
  if (lastDate) {
    dateStr = lastDate.toISOString().slice(0, 10);
  } else {
    // Fallback a hoy si no hay registros
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateStr = `${yyyy}-${mm}-${dd}`;
  }

  // Solo carga los datos del último día
  const { data: initialData } = await getTransactionsPaginated(dateStr, 50, 0);

  // --- NUEVO: Obtén todas las fechas únicas con registros ---
  const allDatesResult = await db
    .select({ fecha: transactions.fecha })
    .from(transactions);
  const allDatesSet = new Set(
    allDatesResult
      .map((r) =>
        r.fecha instanceof Date
          ? r.fecha.toISOString().slice(0, 10)
          : new Date(r.fecha).toISOString().slice(0, 10)
      )
      .filter(Boolean)
  );
  const allDates = Array.from(allDatesSet).sort();

  return (
    <SWRProvider>
      <div className="fixed top-0 left-0 z-50 w-full">
        <Header />
      </div>
      <TransactionTableClient
        initialData={initialData ?? []}
        allDates={allDates}
        onUpdateRecordAction={updateRecords}
      />
    </SWRProvider>
  );
}
