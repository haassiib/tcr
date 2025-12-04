import { prisma } from '@/lib/prisma';
import { cache } from 'react';
import { User } from '@prisma/client';

/**
 * Retrieves all permissions for a given user ID.
 * The result is cached per-request.
 */
export const getUserPermissions = cache(
  async (userId: number): Promise<Set<string>> => {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithRoles) return new Set();

    const permissions = new Set<string>();
    userWithRoles.userRoles.forEach((userRole) => {
      userRole.role.rolePermissions.forEach((rp) =>
        permissions.add(rp.permission.name)
      );
    });

    return permissions;
  }
);

/**
 * Checks if a user has a specific permission.
 */
export async function hasPermission(
  user: User,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(user.id);
  return permissions.has(permission);
}