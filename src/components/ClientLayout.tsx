'use client';

import { SignedIn } from '@clerk/nextjs';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '~/lib/react-query';

import ActivityMonitor from './ActivityMonitor';
import '~/styles/background.css';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <SignedIn>
        <ActivityMonitor />
      </SignedIn>
      <div className="animated-background" />
      {children}
    </QueryClientProvider>
  );
}
