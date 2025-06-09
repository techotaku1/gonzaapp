import TransactionTable from '~/components/TransactionTable';
import { getTransactions, updateRecords } from '~/server/actions/tableGeneral';

// Añadir configuración de no caché
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const initialData = await getTransactions();

  return (
    <main className="container mx-auto h-screen p-4 pt-20">
      {' '}
      {/* Added pt-20 for top padding */}
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-black">
        Registro de Transacciones
      </h1>
      <TransactionTable
        initialData={initialData}
        onUpdateRecordAction={updateRecords}
      />
    </main>
  );
}
