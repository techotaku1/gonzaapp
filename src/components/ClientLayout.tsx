'use client';

import { useState } from 'react';

import { SignedIn } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// import ActivityMonitor from './ActivityMonitor';

import '~/styles/background.css';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <SignedIn>
        {/* <ActivityMonitor /> */}
      </SignedIn>
      <div className="animated-background" />
      {children}
    </QueryClientProvider>
  );
}
