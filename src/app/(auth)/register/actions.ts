// app/(auth)/register/actions.ts
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/hashing';
import { generateToken, generateUuid } from '@/lib/auth/tokens';
import { FormState } from '@/types/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});


export async function registerUser(prevState: FormState, formData: FormData): Promise<FormState> {
  if (!formData) {
    return { error: 'Invalid form submission' };
  }

  const rawFormData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
  };

  const validated = registerSchema.safeParse(rawFormData);
  if (!validated.success) {
    return { error: 'Invalid input' };
  }

  const { email, password, firstName, lastName } = validated.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: 'User already exists' };
  }

  const passwordHash = await hashPassword(password);
  const uuid = generateUuid();

  const user = await prisma.user.create({
    data: {
      uuid,
      email,
      passwordHash,
      firstName,
      lastName,
      emailVerifiedAt: null, // not verified yet
    },
  });

  const token = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    },
  });

  return { success: true };
}