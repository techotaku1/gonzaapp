import CuadreClientTable from '~/components/cuadre/CuadreClientTable';
import { SWRProvider } from '~/components/swr/SWRProvider';
import { getCuadreRecords } from '~/server/actions/cuadreActions';

export const dynamic = 'force-static';

export default async function Page() {
  const initialData = await getCuadreRecords();
  return (
    <SWRProvider fallback={{ '/api/cuadre': initialData }}>
      <CuadreClientTable initialData={initialData} />
    </SWRProvider>
  );
}
