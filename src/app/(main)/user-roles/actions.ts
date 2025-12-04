'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: true } | { error: string };

export async function createOrUpdateRole(data: {
  id?: number;
  name: string;
  description?: string | null;
  permissionIds: number[];
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  const requiredPermission = data.id ? 'roles:update' : 'roles:create';
  if (!permissions.has(requiredPermission)) {
    return { error: 'Unauthorized' };
  }

  const { id, name, description, permissionIds } = data;

  try {
    if (id) {
      // Update role
      await prisma.$transaction(async (tx) => {
      const role = await tx.role.update({
        where: { id },
        data: { name, description },
      });

      // Sync permissions
      const existingPermissions = await tx.rolePermission.findMany({
        where: { roleId: id },
        select: { permissionId: true },
      });
      const existingPermissionIds = new Set(existingPermissions.map(p => p.permissionId));
      const newPermissionIds = new Set(permissionIds);

      const permissionsToAdd = permissionIds.filter(pid => !existingPermissionIds.has(pid));
      const permissionsToRemove = Array.from(existingPermissionIds).filter(pid => !newPermissionIds.has(pid));

      if (permissionsToRemove.length > 0) {
        await tx.rolePermission.deleteMany({
          where: { roleId: id, permissionId: { in: permissionsToRemove } },
        });
      }

      if (permissionsToAdd.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionsToAdd.map(permissionId => ({ roleId: id, permissionId })),
        });
      }

      return role;
    });
    } else {
      // Create role
      await prisma.$transaction(async (tx) => {
        const newRole = await tx.role.create({ data: { name, description } });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map(permissionId => ({ roleId: newRole.id, permissionId })),
          });
        }
        return newRole;
      });
    }
  } catch (error) {
    console.error(error);
    return { error: 'An unexpected error occurred.' };
  }

  revalidatePath('/user-roles');
  return { success: true };
}

export async function assignRolesToUser(data: {
  userId: number;
  roleIds: number[];
  routePath: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has(`${data.routePath}:assign`)) {
    return { error: 'Unauthorized' };
  }

  const { userId, roleIds, routePath } = data;

  await prisma.$transaction(async (tx) => {
    // Find existing roles for the user
    const existingUserRoles = await tx.userRole.findMany({
      where: { userId },
      select: { roleId: true },
    });
    const existingRoleIds = new Set(existingUserRoles.map(ur => ur.roleId));

    // Determine which roles to add and remove
    const rolesToAdd = roleIds.filter(id => !existingRoleIds.has(id));
    const rolesToRemove = Array.from(existingRoleIds).filter(id => !roleIds.includes(id));

    // Remove roles
    if (rolesToRemove.length > 0) {
      await tx.userRole.deleteMany({
        where: { userId, roleId: { in: rolesToRemove } },
      });
    }

    // Add new roles
    await tx.userRole.createMany({
      data: rolesToAdd.map(roleId => ({ userId, roleId })),
    });
  });

  revalidatePath('/user-roles');
  return { success: true };
}

export async function getUserRolesPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  // This page handles both role assignments and role definitions, so we check for either permission.
  if (!permissions.has('user-roles:view') && !permissions.has('roles:view')) {
    throw new Error('Unauthorized');
  }

  const userRoles = await prisma.userRole.findMany({
    include: {
      user: {
        select: { firstName: true, lastName: true },
      },
      role: {
        select: { name: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const allUsers = await prisma.user.findMany({ where: { isActive: true }, orderBy: { firstName: 'asc' } });
  const allRoles = await prisma.role.findMany({ orderBy: { name: 'asc' } });

  return {
    userRoles,
    allUsers,
    allRoles,
    userPermissions: Array.from(permissions),
  };
}