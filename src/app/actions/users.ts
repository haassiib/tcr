// app/actions/users.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';


const userSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  roleIds: z.array(z.coerce.number()).optional(),
  isActive: z.boolean(),
});

export async function updateUser(userId: number, formData: FormData) {

  const raw = {
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string | null,
    roleIds: formData.getAll('roleIds').map(id => parseInt(id as string)),
    isActive: formData.has('isActive'),
  };

  const validated = userSchema.safeParse(raw);
  if (!validated.success) throw new Error('Invalid input');

  const { firstName, lastName, email, phone, roleIds = [], isActive } = validated.data;

  // Prevent deactivation of super admin
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.email === 'admin@example.com' && !isActive) {
    throw new Error('Cannot deactivate super admin');
  }

  await prisma.$transaction(async (tx) => {
    // Update user
    await tx.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        isActive,
      },
    });

    // Sync roles
    await tx.userRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await tx.userRole.createMany({
         data: roleIds.map(roleId => ({ userId, roleId })),
      });
    }
  });

  revalidatePath('/dashboard/users');
  redirect('/dashboard/users');
}

// Optional: standalone toggle for active status
export async function toggleUserStatus(formData: FormData) {
  const userId = parseInt(formData.get('userId') as string);
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.email === 'admin@example.com') {
    throw new Error('Cannot deactivate super admin');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user?.isActive },
  });

  revalidatePath('/dashboard/users');
}