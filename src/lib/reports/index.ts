// lib/reports/index.ts
import { prisma } from '@/lib/prisma';

export async function getBookingStats() {
  const now = new Date();
  const last30Days = new Date();
  last30Days.setDate(now.getDate() - 30);

  // Bookings by day (last 30 days)
  const dailyBookings = await prisma.booking.groupBy({
    by: ['bookedAt'],
    where: { bookedAt: { gte: last30Days } },
    _count: { id: true },
    orderBy: { bookedAt: 'asc' },
  });

  // Revenue by day
  const dailyRevenue = await prisma.payment.groupBy({
    by: ['paidAt'],
    where: { 
      paidAt: { gte: last30Days },
      paymentStatus: 'completed'
    },
    _sum: { amount: true },
    orderBy: { paidAt: 'asc' },
  });

  // Fill missing dates with 0
  const fillDates = (data: { [key: string]: any }[], dateField: string, valueField: string) => {
    const result: { date: string; value: number }[] = [];
    const startDate = new Date(last30Days);
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const found = data.find(d => 
        new Date(d[dateField]).toISOString().split('T')[0] === dateStr
      );
      result.push({ date: dateStr, value: found ? Number(found[valueField]) : 0 });
    }
    return result;
  };

  return {
    dailyBookings: fillDates(dailyBookings, 'bookedAt', '_count.id'),
    dailyRevenue: fillDates(dailyRevenue, 'paidAt', '_sum.amount'),
  };
}

export async function getTopTours() {
  return prisma.tourPackage.findMany({
    where: { isActive: true },
    orderBy: { bookingCount: 'desc' },
    take: 5,
    select: { title: true, bookingCount: true, ratingAvg: true },
  });
}

export async function getUserGrowth() {
  const last7Days = new Date();
  last7Days.setDate(new Date().getDate() - 7);

  return prisma.user.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: last7Days } },
    _count: { id: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getOverviewStats() {
  const [totalUsers, totalBookings, totalRevenue, pendingMessages] = await Promise.all([
    prisma.user.count(),
    prisma.booking.count(),
    prisma.payment.aggregate({ 
      _sum: { amount: true },
      where: { paymentStatus: 'completed' }
    }),
    prisma.contactMessage.count({ where: { status: 'new' } }),
  ]);

  return {
    totalUsers,
    totalBookings,
    totalRevenue: totalRevenue._sum.amount || 0,
    pendingMessages,
  };
}