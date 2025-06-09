'use client';

import {
  UserButton,
  useUser,
  SignedIn,
  SignedOut,
} from '@clerk/nextjs';

export default function Header() {
  const { user } = useUser();

  return (
    <header className="fixed top-0 left-0 z-[40] flex h-16 w-full items-center justify-between bg-white/50 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="relative z-[101] flex items-center gap-4">
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
        <SignedIn>
          <h1 className="font-display text-xl font-bold tracking-tight text-black">
            ¡Bienvenido, {user?.firstName ?? 'Usuario'}!
          </h1>
        </SignedIn>
        <SignedOut>
          <h1 className="font-display text-xl font-bold tracking-tight text-black">
            GonzaApp
          </h1>
        </SignedOut>
      </div>
    </header>
  );
}
