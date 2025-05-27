import TransactionTable from '~/components/TransactionTable';
import { getTransactions, updateRecords } from '~/server/actions/tableGeneral';

// Añadir configuración de no caché
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const initialData = await getTransactions();

  return (
    <main className="container mx-auto p-4">
      <h1 className="font-display mb-8 text-3xl font-bold tracking-tight">
        Registro de Transacciones
      </h1>
      <TransactionTable
        initialData={initialData}
        onUpdateRecordAction={updateRecords}
      />
    </main>
  );
}
