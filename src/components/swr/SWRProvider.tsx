'use client';

import { SWRConfig } from 'swr';

const swrConfig = {
  revalidateOnFocus: false, // Cambiado a false
  revalidateOnReconnect: false, // Cambiado a false
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
