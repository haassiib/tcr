'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: true } | { error: string };

export async function createOrUpdateMenu(
  data: {
    id?: number;
    name: string;
    description?: string | null;
    href?: string | null;
    icon?: string | null;
    order: number;
    parentId?: number | null;
    routePath: string;
  },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  const requiredPermission = data.id ? `${data.routePath}:update` : `${data.routePath}:create`;
  if (!permissions.has(requiredPermission)) {
    return { error: 'Unauthorized' };
  }
  const { id, routePath, ...menuData } = data;
try {
    if (id) {
      // Update menu
      await prisma.menu.update({
        where: { id },
        data: {
          ...menuData,
        },
      });
    } else {
      // Create menu
      await prisma.menu.create({
        data: {
          ...menuData,
        },
      });
    }
  } catch (error) {
    console.error(error);
    return { error: 'An unexpected error occurred while saving the menu.' };
  }

  revalidatePath('/menus');
  return { success: true };
}

export async function getMenusPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('menus:view')) {
    throw new Error('Unauthorized');
  }

  const menus = await prisma.menu.findMany({
    include: {
      parent: true,
    },
    orderBy: { order: 'asc' },
  });

  return { allMenus: menus, userPermissions: Array.from(permissions) };
}