'use client';

import { SignedIn } from '@clerk/nextjs';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '~/lib/react-query';
import '~/styles/background.css';

import Header from './Header';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="animated-background" />
      <SignedIn>
        <Header />
      </SignedIn>
      {children}
    </QueryClientProvider>
  );
}
