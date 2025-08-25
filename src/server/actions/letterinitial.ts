'use server';

import { currentUser } from '@clerk/nextjs/server';

export async function getUserInitial(): Promise<string | null> {
  const user = await currentUser();
  if (!user?.firstName) return null;
  return user.firstName.charAt(0).toUpperCase();
}
