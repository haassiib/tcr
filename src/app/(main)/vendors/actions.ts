'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

type ActionResult = { success: true } | { error: string };

export async function createOrUpdateVendor(data: {
  id?: number;
  name: string;
  description?: string;
  brandId: number;
  userId: number;
  isActive: boolean;
}): Promise<ActionResult> {
  const { id, name, description, brandId, userId, isActive } = data;

  const userSession = await getCurrentUser();
  if (!userSession) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(userSession.id);
  const requiredPermission = id ? 'vendors:update' : 'vendors:create';
  if (!permissions.has(requiredPermission)) {
    return { error: 'Unauthorized' };
  }

try {
    if (id) {
      // Update vendor info
      await prisma.vendor.update({
        where: { id },
        data: {
          name,
          description: description || null,
          brandId,
          userId,
          isActive,
        },
      });
    } else {
      // Create vendor info
      await prisma.vendor.create({
        data: {
          name,
          description: description || null,
          brandId,
          userId,
          isActive,
          uuid: uuidv4(),
        },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'A vendor with this name for the selected brand already exists.' };
    }
    console.error(error);
    return { error: 'An unexpected error occurred.' };
  }

  revalidatePath('/vendors');
  return { success: true };
}

export async function getVendorsPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('vendors:view')) {
    throw new Error('Unauthorized');
  }

  const vendorsData = await prisma.vendor.findMany({
    include: {
      brand: true,
      user: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const brandsData = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
  });

  const usersData = await prisma.user.findMany({
    where: {
      isActive: true,
    },
    orderBy: { firstName: 'asc' },
  });

  return { vendors: vendorsData, brands: brandsData, users: usersData, userPermissions: Array.from(permissions) };
}