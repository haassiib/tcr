'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
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

  const vendorIdInt = vendorId ? parseInt(vendorId, 10) : undefined;
  const brandIdInt = brandId ? parseInt(brandId, 10) : undefined;

  try {
    const balanceMap: Record<number, number> = {};

    // 1. Determine the month and year prior to the report's startDate
    const prevMonthDate = new Date(startDate);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonth = prevMonthDate.getMonth() + 1; // getMonth() is 0-indexed
    const prevMonthYear = prevMonthDate.getFullYear();

    // 2. Fetch the closingBalance from the new VendorMonthlyBalance table
    const monthlyBalances = await prisma.vendorMonthlyBalance.findMany({
      where: {
        month: prevMonth,
        year: prevMonthYear,
        vendor: {
          id: vendorIdInt,
          brandId: brandIdInt,
        },
      },
      select: { vendorId: true, closingBalance: true },
    });

    monthlyBalances.forEach(balance => {
      balanceMap[balance.vendorId] = Number(balance.closingBalance);
    });

    // 3. Fetch stats from the start of the month to the day before the report's startDate
    const startOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    if (startOfMonth < startDate) {
      const statsForOpeningBalance = await prisma.vendorStat.findMany({
        where: {
          statDate: {
            gte: startOfMonth,
            lt: startDate,
          },
          vendor: {
            id: vendorIdInt,
            brandId: brandIdInt,
          },
        },
        select: {
          vendorId: true,
          topUpAmount: true,
          adExpense: true,
          adsChargeback: true,
          adsCommission: true,
        },
        orderBy: { statDate: 'asc' },
      });

      // 4. Calculate the running balance to get the opening balance for startDate
      statsForOpeningBalance.forEach(stat => {
        const adExpense = Number(stat.adExpense);
        const totalAdCost = adExpense + Number(stat.adsChargeback) + (adExpense * (Number(stat.adsCommission) / 100));
        const openingBalance = balanceMap[stat.vendorId] || 0;
        balanceMap[stat.vendorId] = openingBalance + Number(stat.topUpAmount) - totalAdCost;
      });
    }

    // 5. Fetch the actual report data for the selected date range
    const reportData = await prisma.vendorStat.findMany({
      where: {
        statDate: { gte: startDate, lte: endDate },
        vendor: {
          brandId: brandId ? parseInt(brandId, 10) : undefined,
          id: vendorId ? parseInt(vendorId, 10) : undefined,
        },
      },
      orderBy: [
        { vendorId: 'asc' },
        { statDate: 'asc' },
      ],
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
        adsViews: true,
        adsClicks: true,
        vendorId: true,
        vendor: { select: { name: true, brand: { select: { name: true } } } }
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
      const topUpAmount = Number(item.topUpAmount);
      const previousDayBalance = balanceMap[item.vendorId] ?? 0;
      const balance = previousDayBalance + topUpAmount - totalAdCost;
      balanceMap[item.vendorId] = balance; // Update balance for the next day's calculation
      return {
        brand: item.vendor.brand.name,
        vendor: item.vendor.name,
        statDate: item.statDate.toISOString(),
        deposit: Number(item.deposit),
        adExpense,
        withdraw: Number(item.withdraw),
        registration: item.registration,
        firstTimeDeposit: item.firstTimeDeposit,
        totalAdCost,
        dailyBudget: Number(item.dailyBudget),
        topUpAmount,
        balance,
        revenue,
        roi,
        ltv,
        adsViews: item.adsViews,
        adsClicks: item.adsClicks,
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