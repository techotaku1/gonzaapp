import Header from '~/components/Header';
import { SWRProvider } from '~/components/swr/SWRProvider';
import TransactionTableClient from '~/components/transacciones/TransactionTableClient';
import { updateRecords } from '~/server/actions/tableGeneral';

export default function HomePage() {
  return (
    <SWRProvider>
      <div className="fixed top-0 left-0 z-50 w-full">
        <Header />
      </div>
      <TransactionTableClient onUpdateRecordAction={updateRecords} />
    </SWRProvider>
  );
}
