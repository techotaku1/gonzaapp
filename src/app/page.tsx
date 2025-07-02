import Header from '~/components/Header';
import { SWRProvider } from '~/components/swr/SWRProvider';
import TransactionTableClient from '~/components/transacciones/TransactionTableClient';
import {
  getTransactionsPaginated,
  updateRecords,
} from '~/server/actions/tableGeneral';

export default async function HomePage() {
  // Solo obtiene los datos iniciales de la página actual (hoy, primeros 50)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const { data: initialData } = await getTransactionsPaginated(dateStr, 50, 0);

  return (
    <SWRProvider>
      <div className="fixed top-0 left-0 z-50 w-full">
        <Header />
      </div>
      <TransactionTableClient
        initialData={initialData ?? []}
        onUpdateRecordAction={updateRecords}
        // onUpdateRecordAction se pasa igual, el polling incremental lo maneja useAppData
      />
    </SWRProvider>
  );
}
