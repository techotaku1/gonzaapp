import TransactionTable from '~/components/TransactionTable';
import { getTransactions, updateRecords } from '~/server/actions/tableGeneral';

function formatCurrentDate() {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());
}

export default async function HomePage() {
  const initialData = await getTransactions();

  return (
    <main className="container mx-auto p-4">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold font-display tracking-tight">
          Registro de Transacciones
        </h1>
        <time className="text-2xl font-display text-gray-600">
          {formatCurrentDate()}
        </time>
      </div>
      <TransactionTable
        initialData={initialData}
        onUpdateRecordAction={updateRecords}
      />
    </main>
  );
}
