'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { SignedIn,UserButton, useUser } from '@clerk/nextjs';

export default function Header() {
  const { user } = useUser();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      setVisible(currentScrollPos === 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 z-[100] flex h-26 w-full items-center justify-between overflow-hidden shadow-lg shadow-black/20 transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="absolute inset-0 -mt-60">
        <Image
          src="/banner.jpg"
          alt="Banner"
          fill
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
          <h1 className="font-display text-xl font-bold tracking-tight text-white">
            ¡Bienvenido, {user?.firstName ?? 'Usuario'}!
          </h1>
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
          />
        </div>

        {/* Right section */}
        <div className="w-[200px]" />
      </div>
    </header>
  );
}
