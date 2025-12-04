'use server';

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/hashing';

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  if (!token || !newPassword) {
    return { success: false, message: 'Invalid request.' };
  }

  if (newPassword.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters long.' };
  }

  try {
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!resetToken) {
      return { success: false, message: 'This password reset link is invalid or has expired.' };
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true, message: 'Your password has been reset successfully!' };
  } catch (error) {
    console.error('Password reset failed:', error);
    return { success: false, message: 'An unexpected error occurred. Please try again.' };
  }
}