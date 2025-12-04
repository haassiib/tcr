// app/actions/roles.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const roleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  permissionIds: z.array(z.coerce.number()).optional(),
});

export async function createRole(formData: FormData) {

  const raw = {
    name: formData.get('name') as string,
    description: formData.get('description') as string | null,
    permissionIds: formData.getAll('permissionIds').map(id => parseInt(id as string)),
  };

  const validated = roleSchema.safeParse(raw);
  if (!validated.success) throw new Error('Invalid input');

  const { name, description, permissionIds = [] } = validated.data;

  // Check if role name is unique
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) throw new Error('Role name already exists');

  await prisma.role.create({
    data: {
      name,
      description: description || undefined,
      rolePermissions: {
        create: permissionIds.map(id => ({ permissionId: id })),
      },
    },
  });

  revalidatePath('/dashboard/roles');
  redirect('/dashboard/roles');
}

export async function updateRole(roleId: number, formData: FormData) {

  const raw = {
    name: formData.get('name') as string,
    description: formData.get('description') as string | null,
    permissionIds: formData.getAll('permissionIds').map(id => parseInt(id as string)),
  };

  const validated = roleSchema.safeParse(raw);
  if (!validated.success) throw new Error('Invalid input');

  const { name, description, permissionIds = [] } = validated.data;

  // Ensure "admin" role can't be renamed
  const currentRole = await prisma.role.findUnique({ where: { id: roleId } });
  if (currentRole?.name === 'admin' && name !== 'admin') {
    throw new Error('Cannot rename admin role');
  }

  await prisma.$transaction(async (tx) => {
    // Update role
    await tx.role.update({
      where: { id: roleId },
      data: {
        name,
        description: description || null,
      },
    });

    // Sync permissions
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({ roleId, permissionId })),
      });
    }
  });

  revalidatePath('/dashboard/roles');
  redirect('/dashboard/roles');
}