'use client';

import Image from 'next/image';

import { UserButton, useUser, SignedIn } from '@clerk/nextjs';

export default function Header() {
  const { user } = useUser();

  return (
    <header className="fixed top-0 left-0 z-[100] flex h-26 w-full items-center justify-between overflow-hidden">
      <div className="absolute inset-0 -mt-60">
        <Image
          src="/banner.jpg"
          alt="Banner"
          fill
          priority
          sizes="100vw"
          className="object-cover object-top"
          quality={100}
        />
      </div>
      <div className="relative z-[101] flex w-full items-center justify-between px-8">
        {/* Left section */}
        <div className="flex items-center gap-6">
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedIn>
            <h1 className="font-display text-xl font-bold tracking-tight text-white">
              ¡Bienvenido, {user?.firstName ?? 'Usuario'}!
            </h1>
          </SignedIn>
          <Image
            src="/logo2.png"
            alt="Logo"
            width={200}
            height={200}
            style={{
              width: '90px',
              height: '90px',
            }}
            className="object-contain"
            priority
          />
        </div>

        {/* Right section */}
        <div className="w-[200px]" />
      </div>
    </header>
  );
}
