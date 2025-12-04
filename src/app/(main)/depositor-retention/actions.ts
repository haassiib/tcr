'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: true } | { error: string };

export async function createOrUpdateMultipleDepositorRetention(
  data: {
    vendorId: number;
    percentages: { dayName: string; percentage: number; dateOfReturn: Date; id?: number }[];
    routePath: string;
  }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user.id);
  // For batch operations, we can check for both create and update permissions
  if (!permissions.has(`${data.routePath}:create`) || !permissions.has(`${data.routePath}:update`)) {
    return { error: 'Unauthorized' };
  }

  const { vendorId, percentages } = data;

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of percentages) {
        // Use upsert to either create a new entry or update an existing one
        await tx.DepositorRetention.upsert({
          where: {
            vendorId_dayName_dateOfReturn: {
              vendorId,
              dayName: item.dayName,
              dateOfReturn: item.dateOfReturn,
            }
          },
          update: { percentage: item.percentage },
          create: {
            vendorId,
            dayName: item.dayName,
            dateOfReturn: item.dateOfReturn,
            percentage: item.percentage,
          },
        });
      }
    });
  } catch (error) {
    console.error(error);
    return { error: 'An unexpected error occurred while saving the entries.' };
  }

  revalidatePath('/depositor-retention');
  return { success: true };
}

export async function createOrUpdateDepositorRetention(
  data: {
    id?: number;
    vendorId: string;
    dayName: string;
    dateOfReturn: Date;
    percentage: number;
    routePath: string;
  },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user.id);
  const requiredPermission = data.id ? `${data.routePath}:update` : `${data.routePath}:create`;
  if (!permissions.has(requiredPermission)) {
    return { error: 'Unauthorized' };
  }
  const { id, vendorId, dayName, dateOfReturn, percentage } = data;

  const retentionData = {
    vendorId: parseInt(vendorId, 10),
    dayName,
    dateOfReturn,
    percentage,
  };

  try {
    if (id) {
      await prisma.DepositorRetention.update({
        where: { id },
        data: retentionData,
      });
    } else {
      await prisma.DepositorRetention.create({
        data: retentionData,
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'An entry for this vendor and day already exists.' };
    }
    console.error(error);
    return { error: 'An unexpected error occurred.' };
  }

  revalidatePath('/depositor-retention');
  return { success: true };
}

export async function deleteDepositorRetention(data: { id: number; routePath: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has(`${data.routePath}:delete`)) {
    return { error: 'Unauthorized' };
  }

  try {
    await prisma.DepositorRetention.delete({ where: { id: data.id } });
  } catch (error) {
    console.error(error);
    return { error: 'An unexpected error occurred during deletion.' };
  }

  revalidatePath('/depositor-retention');
  return { success: true };
}

export async function getDepositorRetentionPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const permissions = await getUserPermissions(user.id);
  const canViewAll = permissions.has('depositor-retention:view:all');
  const canViewOwn = permissions.has('depositor-retention:view');

  if (!canViewAll && !canViewOwn) {
    throw new Error('Unauthorized');
  }

  const whereClause = canViewAll ? {} : { vendor: { userId: user.id } };

  const retentionEntries = await prisma.DepositorRetention.findMany({
    where: whereClause,
    include: {
      vendor: {
        select: { name: true, brand: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ dateOfReturn: 'desc' }],
  });

  const serializedRetentionEntries = retentionEntries.map(entry => ({
    ...entry,
    percentage: entry.percentage.toNumber(),
    dateOfReturn: entry.dateOfReturn.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  }));

  const vendorsWhereClause = canViewAll ? { isActive: true } : { isActive: true, userId: user.id };
  const vendors = await prisma.vendor.findMany({ where: vendorsWhereClause, select: { id: true, name: true, brandId: true }, orderBy: { name: 'asc' } });
  const brands = await prisma.brand.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });

  return { rorEntries: serializedRetentionEntries, vendors, brands, userPermissions: Array.from(permissions) };
}