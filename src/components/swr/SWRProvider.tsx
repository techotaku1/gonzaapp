'use client';

import { SWRConfig } from 'swr';

const swrConfig = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 2000, // Polling cada 2 segundos
  refreshWhenHidden: true,
  refreshWhenOffline: true,
  dedupingInterval: 1000, // Reduce deduplicación para que el polling sea más efectivo
  keepPreviousData: true, // Mantén los datos previos mientras llegan nuevos
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
