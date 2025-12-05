'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { getUserPermissions } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: true } | { error: string };

export async function createOrUpdateBalance(
  data: {
    id?: number;
    vendorId: string; // vendorId comes as a string from the form
    month: number;
    year: number;
    closingBalance: number;
    routePath: string;
  },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  const requiredPermission = data.id ? `${data.routePath}:update` : `${data.routePath}:create`;
  if (!permissions.has(requiredPermission)) {
    return { error: 'Unauthorized' };
  }
  const { id, vendorId, month, year, closingBalance } = data;

  const balanceData = {
    vendorId: parseInt(vendorId, 10), // Parse string to integer
    month,
    year,
    closingBalance,
  };

  try {
    if (id) {
      // Update balance
      await prisma.vendorMonthlyBalance.update({
        where: { id },
        data: balanceData,
      });
    } else {
      // Create balance
      await prisma.vendorMonthlyBalance.create({
        data: balanceData,
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Unique constraint violation
      return { error: 'A balance entry for this vendor, month, and year already exists.' };
    }
    // For other errors, you might want to log them and return a generic message
    console.error(error);
    return { error: 'An unexpected error occurred.' };
  }

  revalidatePath('/balance');
  return { success: true };
}

export async function getVendorOptions() {
  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        brandId: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return vendors;
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }
}

export async function getBalancesPageData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  const permissions = await getUserPermissions(user.id);
  const canViewAll = permissions.has('balances:view:all');
  const canViewOwn = permissions.has('balances:view');

  if (!canViewAll && !canViewOwn) {
    throw new Error('Unauthorized');
  }

  const whereClause = canViewAll ? {} : { vendor: { userId: user.id } };

  const balancesFromDb = await prisma.vendorMonthlyBalance.findMany({
    where: whereClause,
    include: {
      vendor: {
        select: {
          name: true,
          brandId: true,
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  // Serialize Decimal to number for client-side compatibility
  const balances = balancesFromDb.map(balance => ({
    ...balance,
    closingBalance: balance.closingBalance.toNumber(),
    createdAt: balance.createdAt.toISOString(),
    updatedAt: balance.updatedAt.toISOString(),
  }));

  const vendorsWhereClause = canViewAll ? {} : { userId: user.id };
  const vendors = await prisma.vendor.findMany({
    where: vendorsWhereClause,
    include: { brand: true },
  });

  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return { balances, vendors, brands, userPermissions: Array.from(permissions) };
}