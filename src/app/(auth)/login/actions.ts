// app/(auth)/login/actions.ts
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/hashing';
import { generateUuid } from '@/lib/auth/tokens';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FormState } from '@/types/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginUser(prevState: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const validated = loginSchema.safeParse(raw);
  if (!validated.success) return { error: 'Invalid input' };

  const { email, password } = validated.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return { error: 'Invalid credentials' };
  }

  // Will use this later
  //if (!user.emailVerifiedAt) {
  //  return { error: 'Please verify your email first' };
  //}

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        status: 'failed',
        failureReason: 'Invalid password',
        ipAddress: null, // TODO: get from headers
      },
    });
    return { error: 'Invalid credentials' };
  }

  // Create session (simplified: store user ID in cookie)
  const sessionToken = user.uuid || generateUuid();
  const cookieStore = await cookies()
  cookieStore.set('uuid', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });

  // Save session in DB (optional but recommended)
  await prisma.user.update({
    where: { id: user.id },
    data: { uuid: sessionToken }, // Reuse uuid field for session (or create sessions table)
  });

  await prisma.loginHistory.create({
    data: { userId: user.id, status: 'success', ipAddress: null },
  });

  redirect('/');
}