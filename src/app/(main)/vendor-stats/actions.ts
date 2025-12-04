'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

type ActionResult = { success: true } | { error: string };

export async function updateVendorStat(data: {
  id: number;
  registration?: number;
  firstTimeDeposit?: Decimal | number | string;
  adExpense?: Decimal | number | string;
  adsCommission?: Decimal | number | string;
  dailyBudget?: Decimal | number | string;
  topUpAmount?: Decimal | number | string;
  adsViews?: number;
  adsClicks?: number;
  adsChargeback?: Decimal | number | string;
  deposit?: Decimal | number | string;
  withdraw?: Decimal | number | string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('vendor-stats:update')) {
    return { error: 'Unauthorized' };
  }

  const { id, ...statsData } = data;

  const toDecimal = (value: any): Decimal | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value instanceof Decimal) return value;
    return new Decimal(value);
  };

  const prismaData = Object.fromEntries(
    Object.entries(statsData).map(([key, value]) => {
      const decimalFields = ['adExpense', 'adsCommission', 'dailyBudget', 'topUpAmount', 'adsChargeback', 'deposit', 'withdraw'];
      const intFields = ['registration', 'firstTimeDeposit', 'adsViews', 'adsClicks'];

      if (decimalFields.includes(key)) {
        return [key, toDecimal(value)];
      }
      if (intFields.includes(key)) {
        const num = parseInt(value as string, 10);
        return [key, isNaN(num) ? undefined : num];
      }
      return [key, value];
    })
  );

  await prisma.vendorStat.update({
    where: { id },
    data: prismaData,
  });

  revalidatePath('/vendor-stats');
  return { success: true };
}

export async function updateMultipleVendorStats(updates: {
  id: number;
  registration?: number;
  firstTimeDeposit?: Decimal | number | string;
  adExpense?: Decimal | number | string;
  adsCommission?: Decimal | number | string;
  dailyBudget?: Decimal | number | string;
  topUpAmount?: Decimal | number | string;
  adsViews?: number;
  adsClicks?: number;
  adsChargeback?: Decimal | number | string;
  deposit?: Decimal | number | string;
  withdraw?: Decimal | number | string;
}[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('vendor-stats:update')) {
    return { error: 'Unauthorized' };
  }

  const toDecimal = (value: any): Decimal | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value instanceof Decimal) return value;
    return new Decimal(value);
  };

  const updatePromises = updates.map(update => {
    const { id, ...statsData } = update;
    const prismaData = Object.fromEntries(
      Object.entries(statsData).map(([key, value]) => {
        const decimalFields = ['adExpense', 'adsCommission', 'dailyBudget', 'topUpAmount', 'adsChargeback', 'deposit', 'withdraw'];
        const intFields = ['registration', 'adsViews', 'adsClicks'];

        if (decimalFields.includes(key)) {
          return [key, toDecimal(value)];
        }
        if (intFields.includes(key)) {
          const num = parseInt(value as string, 10);
          return [key, isNaN(num) ? undefined : num];
        }
        return [key, value];
      })
    );
    return prisma.vendorStat.update({ where: { id }, data: prismaData });
  });

  await prisma.$transaction(updatePromises);
  revalidatePath('/vendor-stats');
  return { success: true };
}

export async function createVendorStat(data: {
  vendorId: number;
  statDate: Date;
  registration?: number;
  firstTimeDeposit?: number;
  adExpense?: Decimal | number | string;
  adsCommission?: Decimal | number | string;
  dailyBudget?: Decimal | number | string;
  topUpAmount?: Decimal | number | string;
  adsViews?: number;
  adsClicks?: number;
  adsChargeback?: Decimal | number | string;
  deposit?: Decimal | number | string;
  withdraw?: Decimal | number | string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('vendor-stats:create')) {
    return { error: 'Unauthorized' };
  }

  try {
    await prisma.vendorStat.create({
      data: {
        ...data,
        statDate: new Date(data.statDate),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // This error code indicates a unique constraint violation.
      return { error: 'An entry for this vendor on this date already exists.' };
    }
    console.error(error);
    return { error: 'An unexpected error occurred.' };
  }

  revalidatePath('/vendor-stats');
  revalidatePath('/vendor-stats/entry');
  return { success: true };
}

export async function createVendorStats(data: {
  vendorId: number;
  statDate: Date;
  registration: number;
  firstTimeDeposit: number;  
  adExpense: number;
  adsCommission: number;
  dailyBudget: number;
  topUpAmount: number;
  adsViews: number;
  adsClicks: number;
  adsChargeback: number;
  deposit: number;
  withdraw: number;
}[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('vendor-stats:create')) {
    return { error: 'Unauthorized' };
  }

  const toDecimal = (value: number): Decimal => {
    if (value === null || value === undefined) {
      return new Decimal(0);
    }
    return new Decimal(value);
  };

  try {
    await prisma.$transaction(async (tx) => {
      for (const entry of data) {
        const dataForDb = {
          vendorId: entry.vendorId,
          statDate: entry.statDate,
          registration: entry.registration,
          firstTimeDeposit: entry.firstTimeDeposit,
          adExpense: toDecimal(entry.adExpense),
          adsCommission: toDecimal(entry.adsCommission),
          dailyBudget: toDecimal(entry.dailyBudget),
          topUpAmount: toDecimal(entry.topUpAmount),
          adsViews: entry.adsViews,
          adsClicks: entry.adsClicks,
          adsChargeback: toDecimal(entry.adsChargeback),
          deposit: toDecimal(entry.deposit),
          withdraw: toDecimal(entry.withdraw),
        };

        await tx.vendorStat.upsert({
          where: {
            vendorId_statDate: {
              vendorId: entry.vendorId,
              statDate: entry.statDate,
            },
          },
          update: dataForDb,
          create: dataForDb,
        });
      }
    });
  } catch (error: any) {
    console.error("Failed to create/update vendor stats:", error);
    return { error: 'An unexpected error occurred while saving the stats.' };
  }

  revalidatePath('/vendor-stats');
  revalidatePath('/vendor-stats/entry');
  return { success: true };
}

export async function deleteVendorStat(id: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }
  const permissions = await getUserPermissions(user.id);
  if (!permissions.has('vendor-stats:delete')) {
    return { error: 'Unauthorized' };
  }

  await prisma.vendorStat.delete({
    where: {
      id,
    },
  });
  revalidatePath('/vendor-stats');
  return { success: true };
}

export async function getVendorStatsPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  const canViewAll = permissions.has('vendor-stats:view:all');
  const canViewOwn = permissions.has('vendor-stats:view');

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
    orderBy: { createdAt: 'desc' },
  });

  const vendorsWhereClause = canViewAll ? {} : { userId: user.id };
  const vendors = await prisma.vendor.findMany({
    where: vendorsWhereClause,
    include: { brand: true },
  });

  // Serialize the data to make it safe to pass to client components
  const serializedVendorStats = vendorStats.map((stat) => ({
    ...stat,
    adExpense: stat.adExpense.toString(),
    adsCommission: stat.adsCommission.toString(),
    dailyBudget: stat.dailyBudget.toString(),
    topUpAmount: stat.topUpAmount.toString(),
    adsChargeback: stat.adsChargeback.toString(),
    deposit: stat.deposit.toString(),
    withdraw: stat.withdraw.toString(),
    statDate: stat.statDate.toISOString(),
    createdAt: stat.createdAt.toISOString(),
    updatedAt: stat.updatedAt.toISOString(),
    vendor: {
      ...stat.vendor,
      createdAt: stat.vendor.createdAt.toISOString(),
      brand: {
        ...stat.vendor.brand,
        createdAt: stat.vendor.brand.createdAt.toISOString(),
      }
    }
  }));

  const serializedVendors = vendors.map(vendor => ({
    ...vendor,
    createdAt: vendor.createdAt.toISOString(),
    brand: {
      ...vendor.brand,
      createdAt: vendor.brand.createdAt.toISOString(),
    }
  }));

  return { vendorStats: serializedVendorStats, vendors: serializedVendors, userPermissions: Array.from(permissions) };
}

export async function getVendorStatEntryPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  // Requires create permission to access the bulk entry page
  if (!permissions.has('vendor-stats:create')) {
    throw new Error('Unauthorized');
  }

  const vendors = await prisma.vendor.findMany({
    include: { brand: true },
    orderBy: { name: 'asc' },
  });

  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
  });

  const serializedVendors = vendors.map(vendor => ({
    ...vendor,
    createdAt: vendor.createdAt.toISOString(),
    brand: {
      ...vendor.brand,
      createdAt: vendor.brand.createdAt.toISOString(),
    }
  }));

  const serializedBrands = brands.map(brand => ({
    ...brand,
    createdAt: brand.createdAt.toISOString(),
  }));

  return { vendors: serializedVendors, brands: serializedBrands, userPermissions: Array.from(permissions) };
}