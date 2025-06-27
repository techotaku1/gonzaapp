'use client';

import { SWRConfig } from 'swr';

const swrConfig = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 2000, // Polling cada 2 segundos
  refreshWhenHidden: true, // Polling aunque la pestaña esté oculta
  refreshWhenOffline: true, // Polling cuando vuelva el internet
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
