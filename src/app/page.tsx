import Header from '~/components/Header';
import TransactionTable from '~/components/TransactionTable';
import { getTransactions, updateRecords } from '~/server/actions/tableGeneral';

// Añadir configuración de no caché
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const initialData = await getTransactions();

  return (
    <>
      <div className="fixed top-0 left-0 z-50 w-full">
        <Header />
      </div>
      <main className="container mx-auto min-h-screen p-4 pt-32">
        <div className="flex items-center justify-between">
          <time
            id="current-date-display"
            className="mb-3 font-display text-3xl font-bold tracking-tight text-black"
          />
        </div>
        <TransactionTable
          initialData={initialData}
          onUpdateRecordAction={updateRecords}
        />
      </main>
    </>
  );
}
