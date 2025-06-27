'use client';

import { SWRConfig } from 'swr';

const swrConfig = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
