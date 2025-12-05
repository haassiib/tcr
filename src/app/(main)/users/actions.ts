'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import { hashPassword } from '@/lib/auth/hashing';
import { v4 as uuidv4 } from 'uuid';
import { type Gender, Prisma } from '@prisma/client';

type ActionResult = { success: true } | { error: string };

export async function createOrUpdateUser(data: {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  isActive: boolean;
  roleIds: number[];
  routePath: string;
}): Promise<ActionResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(currentUser.id);
  const requiredPermission = data.id ? `${data.routePath}:update` : `${data.routePath}:create`;
  if (!permissions.has(requiredPermission)) {
    return { error: 'Unauthorized' };
  }

  const { id, firstName, lastName, email, password, phone, avatarUrl, dateOfBirth, gender, isActive, roleIds, routePath } = data;

  try {
    if (id) {
      // Prevent users from editing their own active status or roles
      if (id === currentUser.id) {
        const userToUpdate = await prisma.user.findUnique({
          where: { id },
          include: { userRoles: true },
        });

        if (userToUpdate && (data.isActive !== userToUpdate.isActive || JSON.stringify(data.roleIds.sort()) !== JSON.stringify(userToUpdate.userRoles.map(ur => ur.roleId).sort()))) {
          return { error: 'Users cannot change their own active status or roles.' };
        }
      }

      // Update user
      const userData: any = {
        firstName,
        lastName,
        email,
        phone: phone || null,
        avatarUrl: avatarUrl || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: (gender as Gender) || null,
        isActive,
        userRoles: {
          deleteMany: {},
          create: roleIds.map(roleId => ({
            roleId,
          })),
        },
      };

      if (password) {
        userData.passwordHash = await hashPassword(password);
      }

      await prisma.user.update({
        where: { id },
        data: userData,
      });
    } else {
      // Create user
      if (!password) {
        return { error: 'Password is required for new users.' };
      }

      await prisma.user.create({
        data: {
          uuid: uuidv4(),
          firstName,
          lastName,
          email,
          passwordHash: await hashPassword(password),
          phone: phone || null,
          avatarUrl: avatarUrl || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: (gender as Gender) || null,
          isActive,
          userRoles: {
            create: roleIds.map(roleId => ({
              roleId,
            })),
          },
        },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'A user with this email already exists.' };
    }
    console.error(error);
    return { error: 'An unexpected error occurred.' };
  }

  revalidatePath('/users');
  revalidateTag('current-user', 'layout');
  return { success: true };
}

export async function toggleUserStatus(data: { id: number; routePath: string }): Promise<ActionResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(currentUser.id);
  if (!permissions.has(`${data.routePath}:update`)) {
    return { error: 'Unauthorized' };
  }

  // Prevent a user from deactivating themselves
  if (data.id === currentUser.id) {
    return { error: 'You cannot change your own active status.' };
  }

  const userToToggle = await prisma.user.findUnique({
    where: { id: data.id },
    select: { isActive: true },
  });

  if (!userToToggle) {
    return { error: 'User not found' };
  }

  await prisma.user.update({
    where: { id: data.id },
    data: {
      isActive: !userToToggle.isActive,
    },
  });

  revalidatePath('/users');
  return { success: true };
}

export async function getUsersPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('users:view')) {
    throw new Error('Unauthorized');
  }

  const usersData = await prisma.user.findMany({
    include: {
      userRoles: { include: { role: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rolesData = await prisma.role.findMany({ orderBy: { name: 'asc' } });

  return { users: usersData, roles: rolesData, userPermissions: Array.from(permissions) };
}
