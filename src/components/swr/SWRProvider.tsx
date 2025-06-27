'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({
  children,
  fallback = {},
}: {
  children: React.ReactNode;
  fallback?: Record<string, unknown>;
}) {
  const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
    fallback,
  };
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
