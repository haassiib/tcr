'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { revalidatePath } from 'next/cache';

type PermissionData = {
  id?: number;
  name: string;
  description: string;
  type?: string;
};

export async function createOrUpdatePermission(
  data: (PermissionData | PermissionData[]) & { routePath: string }
) {
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user.id);
  const { routePath, ...payload } = data;

  if (Array.isArray(payload)) {
    // Bulk create
    if (!permissions.has(`${routePath}:create`)) throw new Error('Unauthorized');
    const createData = payload;
    await prisma.permission.createMany({
      data: createData.map(({ name, description, type }) => ({
        name: type ? `${name}:${type}` : name,
        description,
      })),
      skipDuplicates: true, // In case some permissions already exist
    });
  } else {
    // Single create or update
    const { id, name, description } = payload;
    const requiredPermission = id ? `${routePath}:update` : `${routePath}:create`;
    if (!permissions.has(requiredPermission)) throw new Error('Unauthorized');

    if (id) {
      // Update
      await prisma.permission.update({
        where: { id },
        data: { name, description },
      });
    } else {
      // Create
      await prisma.permission.create({ data: { name, description } });
    }
  }

  revalidatePath('/permissions');
  revalidatePath('/roles'); // Also revalidate roles page as permissions might affect it
}

export async function deletePermission(data: { id: number; routePath: string }) {
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has(`${data.routePath}:delete`)) throw new Error('Unauthorized');

  // You might want to add a check here to prevent deletion if the permission is in use
  await prisma.permission.delete({ where: { id: data.id } });
  revalidatePath('/permissions');
  revalidatePath('/roles');
}

export async function getPermissionsPageData() {
  const user = await getCurrentUser();
  const userPermissions = await getUserPermissions(user.id);

  const permissions = await prisma.permission.findMany({
    include: {
      rolePermissions: {
        include: {
          role: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Serialize the data to make it safe to pass to client components
  const serializedPermissions = permissions.map(permission => ({
    ...permission,
    createdAt: permission.createdAt.toISOString(),
    rolePermissions: permission.rolePermissions.map(rp => ({
      ...rp,
      createdAt: rp.createdAt.toISOString(),
      role: {
        ...rp.role,
        createdAt: rp.role.createdAt.toISOString(),
      }
    }))
  }));

  const menus = await prisma.menu.findMany({
    where: {
      parentId: { not: null }, // Only include menus that have a path
    },
    select: {
      id: true,
      name: true,
      href: true,
    },
    orderBy: { name: 'asc' },
  });

  const menuNames = menus.map(menu => ({
    // Use the last part of the href as the value, fallback to a sanitized name
    value: menu.href?.split('/').pop() || menu.name.toLowerCase().replace(/\s+/g, '-'),
    label: menu.name,
  }));


  return { permissions: serializedPermissions, userPermissions: Array.from(userPermissions), menuNames };
}