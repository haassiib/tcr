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

// Helper function to calculate percentile
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  arr.sort((a, b) => a - b);
  const index = (arr.length - 1) * p;
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index - lower;
  if (upper >= arr.length) return arr[lower];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}

// Helper function for the normalization logic from the Excel formula
function normalize(value: number, p05: number, p95: number, invert: boolean = false): number {
  if (p95 - p05 === 0) {
    return 0.5; // Avoid division by zero
  }
  let normalizedValue = (value - p05) / (p95 - p05);
  if (invert) {
    normalizedValue = 1 - normalizedValue;
  }
  // Equivalent to MAX(0, MIN(1, ...))
  return Math.max(0, Math.min(1, normalizedValue));
}

export async function getScoreReport(params: {
  startDate: Date;
  endDate: Date;
  brandId: string | null;
  vendorId: string | null;
  routePath: string;
}) {
  const user = await getCurrentUser();
  const permissions = await getUserPermissions(user.id);
  const canViewAll = permissions.has(`${params.routePath}:view:all`);
  const canViewOwn = permissions.has(`${params.routePath}:view`);

  if (!canViewAll && !canViewOwn) {
    throw new Error('Unauthorized');
  }

  const validation = reportSchema.safeParse(params);
  if (!validation.success) {
    console.error("Invalid parameters for getScoreReport", validation.error.format());
    return [];
  }

  const { startDate, endDate, brandId, vendorId } = validation.data;

  try {
    const vendorWhere: {
      brandId?: number;
      id?: number;
      userId?: number;
    } = {
      brandId: brandId ? parseInt(brandId, 10) : undefined,
      id: vendorId ? parseInt(vendorId, 10) : undefined,
    };

    if (!canViewAll) {
      vendorWhere.userId = user.id;
    }
    const vendorStatsData = await prisma.vendorStat.findMany({
      where: {
        statDate: { gte: startDate, lte: endDate },
        vendor: vendorWhere,
      },
      select: {
        id: true, // Keep id for keys
        vendorId: true,
        statDate: true,
        deposit: true,
        withdraw: true,
        registration: true,
        firstTimeDeposit: true,
        adExpense: true,
        adsChargeback: true,
        adsCommission: true,
        adsViews: true,
        adsClicks: true,
        vendor: { select: { id: true, name: true, brand: { select: { name: true } } } },
      },
    });

    const vendorIds = [...new Set(vendorStatsData.map(s => s.vendorId))];
    const rorData = await prisma.DepositorRetention.findMany({
      where: {
        vendorId: { in: vendorIds },
        dateOfReturn: { gte: startDate, lte: endDate },
      },
    });

    // Pre-calculate metrics for all items to compute percentiles
    const metrics = vendorStatsData.map(item => {
      const adExpense = Number(item.adExpense);
      const adsChargeback = Number(item.adsChargeback);
      const adsCommission = Number(item.adsCommission);
      const totalAdCost = adExpense + adsChargeback + (adExpense * (adsCommission / 100));
      const deposit = Number(item.deposit);
      const withdraw = Number(item.withdraw);
      const revenue = deposit - withdraw; // Column E
      const conversionRate = item.registration > 0 ? (item.firstTimeDeposit / item.registration) * 100 : 0; // Column F
      const ftdCost = item.firstTimeDeposit > 0 ? totalAdCost / item.firstTimeDeposit : 0; // Column Q

      const rorForDate = rorData.filter(r => r.vendorId === item.vendorId && r.dateOfReturn.toDateString() === item.statDate.toDateString());
      const getRor = (dayName: string) => Number(rorForDate.find(r => r.dayName === dayName)?.percentage ?? 0);

      return {
        ...item,
        revenue,
        conversionRate,
        ftdCost,
        totalAdCost,
        nfd: getRor('NFD'), // Column G
        d1: getRor('D1'),   // Column H
        d3: getRor('D3'),   // Column I
        d7: getRor('D7'),   // Column J
        d15: getRor('D15'), // Column K
        d30: getRor('D30'), // Column L
      };
    });

    if (metrics.length === 0) return [];

    // Calculate percentiles for each metric across the entire dataset
    const p = (field: keyof typeof metrics[0], perc: number) => percentile(metrics.map(m => m[field] as number), perc);

    const percentiles = {
      revenue: { p05: p('revenue', 0.05), p95: p('revenue', 0.95) },
      conversionRate: { p05: p('conversionRate', 0.05), p95: p('conversionRate', 0.95) },
      ftdCost: { p05: p('ftdCost', 0.05), p95: p('ftdCost', 0.95) },
      nfd: { p05: p('nfd', 0.05), p95: p('nfd', 0.95) },
      d1: { p05: p('d1', 0.05), p95: p('d1', 0.95) },
      d3: { p05: p('d3', 0.05), p95: p('d3', 0.95) },
      d7: { p05: p('d7', 0.05), p95: p('d7', 0.95) },
      d15: { p05: p('d15', 0.05), p95: p('d15', 0.95) },
      d30: { p05: p('d30', 0.05), p95: p('d30', 0.95) },
    };

    // Calculate score for each item
    return metrics.map(item => {
      const norm = (field: keyof typeof percentiles, value: number, invert = false) =>
        normalize(value, percentiles[field].p05, percentiles[field].p95, invert);

      const weightedSum =
        0.25 * norm('revenue', item.revenue) +
        0.15 * norm('conversionRate', item.conversionRate) +
        0.20 * norm('ftdCost', item.ftdCost, true) + // Inverted, lower is better
        0.10 * norm('nfd', item.nfd) +
        0.05 * norm('d1', item.d1) +
        0.07 * norm('d3', item.d3) +
        0.08 * norm('d7', item.d7) +
        0.05 * norm('d15', item.d15) +
        0.05 * norm('d30', item.d30);

      // C3 in the formula seems to be registration count
      const registrationFactor = Math.min(1, Math.sqrt(item.registration / 50));

      const score = 100 * weightedSum * registrationFactor;

      const ltv = item.firstTimeDeposit > 0 ? item.revenue / item.firstTimeDeposit : 0;
      const roi = item.totalAdCost > 0 ? (item.revenue / item.totalAdCost) * 100 : 0;

      return {
        brand: item.vendor.brand.name,
        vendor: item.vendor.name,
        statDate: item.statDate.toISOString(),
        registration: item.registration,
        firstTimeDeposit: item.firstTimeDeposit,
        adExpense: Number(item.adExpense),
        totalAdCost: item.totalAdCost,
        adsViews: item.adsViews,
        adsClicks: item.adsClicks,
        ltv,
        revenue: item.revenue,
        roi,
        score,
        // Include new metrics for display
        conversionRate: item.conversionRate,
        ftdCost: item.ftdCost,
      };
    });
  } catch (error) {
    console.error('Error fetching score report:', error);
    return [];
  }
}

export async function getVendorOptions(data: { brandId?: string | null; routePath: string }) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const permissions = await getUserPermissions(user.id);
  const canViewAll = permissions.has(`${data.routePath}:view:all`);
  const canViewOwn = permissions.has(`${data.routePath}:view`);

  if (!canViewAll && !canViewOwn) {
    throw new Error('Unauthorized');
  }

  try {
    const where: { isActive: boolean; brandId?: number; userId?: number } = {
      isActive: true,
      brandId: data.brandId ? parseInt(data.brandId, 10) : undefined,
    };
    if (!canViewAll) {
      where.userId = user.id;
    }
    const vendors = await prisma.vendor.findMany({
      where,
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
  const canViewAll = permissions.has(`${data.routePath}:view:all`);
  const canViewOwn = permissions.has(`${data.routePath}:view`);

  if (!canViewAll && !canViewOwn) {
    throw new Error('Unauthorized');
  }

  try {
    if (!canViewAll) {
      const userVendors = await prisma.vendor.findMany({ where: { userId: user.id }, select: { brandId: true } });
      const brandIds = [...new Set(userVendors.map(v => v.brandId))];
      const brands = await prisma.brand.findMany({ where: { id: { in: brandIds }, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
      return brands.map(brand => ({ value: brand.id.toString(), label: brand.name }));
    }

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