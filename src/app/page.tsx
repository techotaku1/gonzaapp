import TransactionTable from '~/components/TransactionTable';
import { getTransactions, updateRecords } from '~/server/actions/tableGeneral';

export default async function HomePage() {
  const initialData = await getTransactions();

  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-8 text-3xl font-bold">Registro de Transacciones</h1>
      <TransactionTable
        initialData={initialData}
        onUpdateRecordAction={updateRecords}
      />
    </main>
  );
}
