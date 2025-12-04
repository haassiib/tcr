import { SidebarProvider } from '@/contexts/SidebarContext'
import { getCurrentUser } from '@/lib/auth/session';
import { Sidebar } from '@/components/Sidebar';
import { MainContent } from './MainContent';

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getCurrentUser();
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarProvider>
        <Sidebar user={user} />
        <MainContent user={user}>{children}</MainContent>
      </SidebarProvider>
    </div>
  )
}