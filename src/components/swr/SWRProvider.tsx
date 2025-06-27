'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({
  children,
}: {
  children: React.ReactNode;
  fallback?: Record<string, unknown>;
}) {
  const swrConfig = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 0,
    fallback: {},
  };
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
