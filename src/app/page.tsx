import Header from '~/components/Header';
import { SWRProvider } from '~/components/swr/SWRProvider';
import TransactionTableClient from '~/components/transacciones/TransactionTableClient';
import { getTransactions, updateRecords } from '~/server/actions/tableGeneral';

export default async function HomePage() {
  const initialData = await getTransactions();
  return (
    <SWRProvider>
      <div className="fixed top-0 left-0 z-50 w-full">
        <Header />
      </div>
      <TransactionTableClient
        initialData={initialData}
        onUpdateRecordAction={updateRecords}
      />
    </SWRProvider>
  );
}