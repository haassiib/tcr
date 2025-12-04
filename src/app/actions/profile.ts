// app/actions/profile.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/hashing';
import { generateToken } from '@/lib/auth/tokens';
import { sendVerificationEmail } from '@/lib/utils/email';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const raw = {
    firstName: formData.get('firstName')?.toString() || '',
    lastName: formData.get('lastName')?.toString() || '',
    email: formData.get('email')?.toString() || '',
    phone: formData.get('phone')?.toString() || '',
    dateOfBirth: formData.get('dateOfBirth')?.toString() || '',
    gender: formData.get('gender')?.toString() || null,
  };

  // Handle empty string → null for optional fields
  const cleaned = {
    ...raw,
    phone: raw.phone === '' ? null : raw.phone,
    dateOfBirth: raw.dateOfBirth === '' ? null : raw.dateOfBirth,
    gender: raw.gender === '' ? null : (raw.gender as 'male' | 'female' | 'other' | null),
  };

  const validated = profileSchema.safeParse(cleaned);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const data = validated.data;

  try {
    // Check if email is being changed
    const emailChanged = data.email !== user.email;
    let emailVerifiedAt = user.emailVerifiedAt;

    if (emailChanged) {
      // Send new verification email
      const token = generateToken();
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
        },
      });
      //await sendVerificationEmail({ email: data.email, token });
      emailVerifiedAt = null; // require re-verification
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender,
        emailVerifiedAt,
      },
    });

    revalidatePath('/profile');
    return { success: emailChanged ? 'Profile updated. Please verify your new email.' : 'Profile updated successfully.' };
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return { error: 'Email is already in use.' };
    }
    return { error: 'Failed to update profile. Please try again.' };
  }
}

export async function updatePassword(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.passwordHash) return { error: 'Unauthorized' };

  const raw = {
    currentPassword: formData.get('currentPassword')?.toString() || '',
    newPassword: formData.get('newPassword')?.toString() || '',
    confirmPassword: formData.get('confirmPassword')?.toString() || '',
  };

  const validated = passwordSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { currentPassword, newPassword } = validated.data;

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    return { error: 'Current password is incorrect.' };
  }

  const newPasswordHash = await hashPassword(newPassword);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });
    revalidatePath('/profile');
    return { success: 'Password updated successfully.' };
  } catch {
    return { error: 'Failed to update password. Please try again.' };
  }
}