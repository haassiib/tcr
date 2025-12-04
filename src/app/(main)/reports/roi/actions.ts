'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reportSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  brandId: z.string().nullable(),
  vendorId: z.string().nullable(),
  routePath: z.string(),
});

export async function getVendorSummaryReport(params: {
  startDate: Date;
  endDate: Date;
  brandId: string | null;
  vendorId: string | null;
  routePath: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const permissions = await getUserPermissions(user.id);
  if (!permissions.has(`${params.routePath}:view`)) {
    throw new Error('Unauthorized');
  }

  const validation = reportSchema.safeParse(params);
  if (!validation.success) {
    console.error("Invalid parameters for getVendorSummaryReport", validation.error.format());
    return [];
  }

  const { startDate, endDate, brandId, vendorId } = validation.data;

  try {
    const reportData = await prisma.vendorStat.findMany({
      where: {
        statDate: { gte: startDate, lte: endDate },
        vendor: {
          brandId: brandId ? parseInt(brandId, 10) : undefined,
          id: vendorId ? parseInt(vendorId, 10) : undefined,
        },
      },
      select: {
        statDate: true,
        deposit: true,
        withdraw: true,
        registration: true,
        firstTimeDeposit: true,
        adExpense: true,
        adsChargeback: true,
        adsCommission: true,
        dailyBudget: true,
        topUpAmount: true,
        vendor: { select: { name: true, brand: { select: { name: true } } } },
      },
    });

    const resultWithROI = reportData.map(item => {
      const deposit = Number(item.deposit);
      const withdraw = Number(item.withdraw);
      const revenue = deposit - withdraw;
      const adExpense = Number(item.adExpense);
      const adsChargeback = Number(item.adsChargeback);
      const adsCommission = Number(item.adsCommission);
      const totalAdCost = adExpense + adsChargeback + (adExpense * (adsCommission / 100));
      const roi = totalAdCost > 0 ? (revenue / totalAdCost) * 100 : 0;
      const ltv = item.firstTimeDeposit > 0 ? revenue / item.firstTimeDeposit : 0;
      return {
        brand: item.vendor.brand.name,
        vendor: item.vendor.name,
        statDate: item.statDate.toISOString(),
        deposit: Number(item.deposit),
        registration: item.registration,
        withdraw: Number(item.withdraw),
        registration: item.registration,
        firstTimeDeposit: item.firstTimeDeposit,
        totalAdCost,
        revenue,
        roi,
        ltv,
      };
    });

    return resultWithROI;
  } catch (error) {
    console.error('Error fetching vendor summary report:', error);
    return [];
  }
}

export async function getVendorOptions(data: { brandId?: string | null; routePath: string }) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const permissions = await getUserPermissions(user.id);
  if (!permissions.has(`${data.routePath}:view`)) {
    throw new Error('Unauthorized');
  }

  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
        brandId: data.brandId ? parseInt(data.brandId, 10) : undefined,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return vendors.map(vendor => ({
      value: vendor.id.toString(),
      label: vendor.name,
    }));
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }
}


export async function getBrandOptions(data: { routePath: string }) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const permissions = await getUserPermissions(user.id);
  if (!permissions.has(`${data.routePath}:view`)) {
    throw new Error('Unauthorized');
  }

  try {
    const brands = await prisma.brand.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return brands.map(brand => ({
      value: brand.id.toString(),
      label: brand.name,
    }));
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
}