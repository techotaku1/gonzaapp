'use client';

import { SignedIn } from '@clerk/nextjs';

import ActivityMonitor from './ActivityMonitor';

import '~/styles/background.css';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SignedIn>
        <ActivityMonitor />
      </SignedIn>
      <div className="animated-background" />
      {children}
    </>
  );
}
