'use server';

// lib/auth/session.ts
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

/**
 * Get the current authenticated user (server-side only)
 * Returns null if not logged in
 */
export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('uuid')?.value;
  if (!sessionToken) return null;

  const user = await prisma.user.findUnique({
    where: { uuid: sessionToken },
  });

  return user;
}