import { prisma } from '@/lib/prisma';

import LoginHistoryClientPage from './LoginHistoryClientPage';

export default async function LoginHistoryPage() {

  const loginHistory = await prisma.loginHistory.findMany({
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        }
      }
    },
    orderBy: { loginAt: 'desc' },
    take: 200, // Limit the initial load to the last 200 entries
  });

  return (
    <LoginHistoryClientPage history={loginHistory} />
  );
}