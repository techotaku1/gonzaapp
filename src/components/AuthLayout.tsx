'use client';

import { useState, useEffect } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen w-full">
      <div
        className="relative hidden w-1/2 lg:block"
        style={{
          backgroundImage: 'url(/fondo.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="absolute inset-0 bg-black/30" />
        </div>
      </div>
      <div className="flex w-full items-center justify-center p-0 lg:w-1/2">
        <div className="scale-90 transform">{children}</div>
      </div>
    </div>
  );
}
