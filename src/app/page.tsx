import Header from '~/components/Header';
import TransactionTableClient from '~/components/transacciones/TransactionTableClient';
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
      <TransactionTableClient
        initialData={initialData}
        onUpdateRecordAction={updateRecords}
      />
    </>
  );
}
