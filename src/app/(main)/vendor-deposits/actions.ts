'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
 
type ActionResult = { success: true } | { error: string };

export async function updateVendorDeposit(data: {
  id?: number;
  vendorId?: number;
  statDate?: Date;
  deposit?: Decimal | number | string;
  withdraw?: Decimal | number | string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  const requiredPermission = data.id ? 'vendor-deposits:update' : 'vendor-deposits:create';

  if (!permissions.has(requiredPermission)) {
    return { error: 'Unauthorized' };
  }

  const { id, vendorId, statDate, ...statsData } = data;

  const toDecimal = (value: any): Decimal | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value instanceof Decimal) return value;
    return new Decimal(value);
  };

  const prismaData = {
    deposit: toDecimal(statsData.deposit),
    withdraw: toDecimal(statsData.withdraw),
  };

  try {
    if (id) {
      await prisma.vendorStat.update({ where: { id }, data: prismaData });
    } else if (vendorId && statDate) {
       await prisma.vendorStat.upsert({
          where: { vendorId_statDate: { vendorId, statDate } },
          update: prismaData,
          create: { vendorId, statDate, ...prismaData },
        });
    } else {
        return { error: 'Missing required data for creation.' };
    }
  } catch (e) {
      console.error(e);
      return { error: 'Database operation failed.' };
  }

  revalidatePath('/vendor-deposits');
  return { success: true };
}

export async function updateMultipleVendorDeposits(updates: {
  id: number;
  deposit?: Decimal | number | string;
  withdraw?: Decimal | number | string;
}[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('vendor-deposits:update')) {
    return { error: 'Unauthorized' };
  }

  const toDecimal = (value: any): Decimal | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value instanceof Decimal) return value;
    return new Decimal(value);
  };

  const updatePromises = updates.map(update => {
    const { id, ...statsData } = update;
    const prismaData = {
      deposit: toDecimal(statsData.deposit),
      withdraw: toDecimal(statsData.withdraw),
    };
    return prisma.vendorStat.update({ where: { id }, data: prismaData });
  });

  await prisma.$transaction(updatePromises);
  revalidatePath('/vendor-deposits');
  return { success: true };
}

export async function getVendorDepositPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  const canViewAll = permissions.has('vendor-deposits:view:all');
  const canViewOwn = permissions.has('vendor-deposits:view');

  if (!canViewAll && !canViewOwn) {
    throw new Error('Unauthorized');
  }

  const whereClause = canViewAll ? {} : { vendor: { userId: user.id } };

  const vendorStats = await prisma.vendorStat.findMany({
    where: whereClause,
    include: {
      vendor: {
        include: {
          brand: true,
        },
      },
    },
    orderBy: { statDate: 'desc' },
  });

  const vendorsWhereClause = canViewAll ? {} : { userId: user.id };
  const vendors = await prisma.vendor.findMany({
    where: vendorsWhereClause,
    include: { brand: true },
  });

  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  // Serialize the data to make it safe to pass to client components
  const serializedVendorStats = vendorStats.map((stat) => ({
    ...stat,
    deposit: stat.deposit.toString(),
    withdraw: stat.withdraw.toString(),
    statDate: stat.statDate.toISOString(),
    // other fields needed by the page
    adExpense: stat.adExpense.toString(),
    adsCommission: stat.adsCommission.toString(),
    dailyBudget: stat.dailyBudget.toString(),
    topUpAmount: stat.topUpAmount.toString(),
    adsChargeback: stat.adsChargeback.toString(),
    createdAt: stat.createdAt.toISOString(),
    updatedAt: stat.updatedAt.toISOString(),
  }));

  return { vendorStats: serializedVendorStats, vendors, brands, userPermissions: Array.from(permissions) };
}

export async function getVendorDepositEntryPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  const canViewAll = permissions.has('vendor-deposits:view:all');
  const canViewOwn = permissions.has('vendor-deposits:view');

  if (!canViewAll && !canViewOwn) {
    throw new Error('Unauthorized');
  }

  const vendorsWhereClause = canViewAll ? {} : { userId: user.id };
  const vendors = await prisma.vendor.findMany({
    where: vendorsWhereClause,
    include: { brand: true },
    orderBy: { name: 'asc' },
  });

  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return { vendors, brands, userPermissions: Array.from(permissions) };
}

export async function upsertVendorDepositsForMonth(data: {
  vendorId: number;
  year: number;
  month: number;
  entries: { date: Date; deposit?: string; withdraw?: string }[];
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('vendor-deposits:create') && !permissions.has('vendor-deposits:update')) {
    return { error: 'Unauthorized' };
  }

  const { vendorId, entries } = data;

  try {
    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        await tx.vendorStat.upsert({
          where: {
            vendorId_statDate: { vendorId, statDate: entry.date },
          },
          update: {
            deposit: entry.deposit ? new Decimal(entry.deposit) : undefined,
            withdraw: entry.withdraw ? new Decimal(entry.withdraw) : undefined,
          },
          create: {
            vendorId,
            statDate: entry.date,
            deposit: entry.deposit ? new Decimal(entry.deposit) : 0,
            withdraw: entry.withdraw ? new Decimal(entry.withdraw) : 0,
          },
        });
      }
    });
  } catch (error) {
    console.error('Error upserting vendor deposits:', error);
    return { error: 'An unexpected error occurred while saving.' };
  }

  revalidatePath('/vendor-deposits');
  return { success: true };
}

export async function getVendorDepositsForMonth(vendorId: number, year: number, month: number) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('vendor-deposits:view')) {
    throw new Error('Unauthorized');
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const stats = await prisma.vendorStat.findMany({
    where: {
      vendorId,
      statDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      statDate: true,
      deposit: true,
      withdraw: true,
    },
  });
  return stats.map(stat => ({
    statDate: stat.statDate,
    deposit: stat.deposit.toString(),
    withdraw: stat.withdraw.toString(),
  }));
}