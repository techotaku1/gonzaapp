'use client';

import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '~/lib/react-query';
import '~/styles/background.css';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="animated-background" />
      {children}
    </QueryClientProvider>
  );
}
