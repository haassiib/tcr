'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: true } | { error: string };

export async function createOrUpdateBrand(
  data: {
    id?: number;
    name: string;
    description?: string;
    isActive: boolean;
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

  const { id, name, description, isActive } = data;

  try {
    if (id) {
      // Update brand
      await prisma.brand.update({
        where: { id },
        data: { name, description: description || null, isActive },
      });
    } else {
      // Create brand
      await prisma.brand.create({
        data: { name, description: description || null, isActive },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'A brand with this name already exists.' };
    }
    console.error(error);
    return { error: 'An unexpected error occurred.' };
  }

  revalidatePath('/brands');
  return { success: true };
}

export async function getBrandsPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('brands:view')) {
    throw new Error('Unauthorized');
  }

  const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
  return { brands, userPermissions: Array.from(permissions) };
}