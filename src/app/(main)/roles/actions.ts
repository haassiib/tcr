'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { revalidatePath } from 'next/cache';

export async function getRolesPageDataWithPermissions() {
  const user = await getCurrentUser();

  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('roles:view')) {
    throw new Error('Unauthorized');
  }

  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: {
          },
        },
      },
      userRoles: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  const allPermissions = await prisma.permission.findMany();

  return { roles, permissions: allPermissions, userPermissions: Array.from(permissions) };
}

export async function createOrUpdateRole(data: {
  id?: number;
  name: string;
  description: string;
  permissionIds: number[];
  routePath: string;
}) {
  const { id, name, description, permissionIds, routePath } = data;

  const user = await getCurrentUser();

  const permissions = await getUserPermissions(user.id);
  const requiredPermission = id ? `${routePath}:update` : `${routePath}:create`;
  if (!permissions.has(requiredPermission)) {
    throw new Error('Unauthorized');
  }

  if (id) {
    // Update
    await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        rolePermissions: {
          deleteMany: {},
          create: permissionIds.map(permissionId => ({
            permissionId,
          })),
        },
      },
    });
  } else {
    // Create
    await prisma.role.create({
      data: {
        name,
        description,
        rolePermissions: {
          create: permissionIds.map(permissionId => ({
            permissionId,
          })),
        },
      },
    });
  }

  revalidatePath('/roles');
}

export async function deleteRole(data: { id: number; routePath: string }) {
  const user = await getCurrentUser();

  const permissions = await getUserPermissions(user.id);
  if (!permissions.has(`${data.routePath}:delete`)) {
    throw new Error('Unauthorized');
  }

  const role = await prisma.role.findUnique({ where: { id: data.id } });
  if (role?.name === 'admin') throw new Error('Cannot delete admin role');

  await prisma.role.delete({ where: { id: data.id } });
  revalidatePath('/roles');
}