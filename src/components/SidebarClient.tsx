'use client'

import { useState } from 'react'
import { 
  X,
  Home, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Users, 
  Shield, 
  ShieldCheck, 
  UserCheck, 
  FileText, 
  Activity,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils/clsx'
import { MenuItem } from './MenuItem'
import { useSidebarContext } from '../contexts/SidebarContext'
import { User } from '@prisma/client'
import { MenuItem as MenuItemType } from '@/types/dashboard'

const iconMap: Record<string, LucideIcon> = {
  Home,
  ShoppingCart,
  BarChart3,
  Settings,
  Users,
  Shield,
  ShieldCheck,
  UserCheck,
  FileText,
  Activity,
};

interface SerializableMenuItem {
  id: number;
  name: string;
  href?: string;
  icon: string;
  active?: boolean;
  children?: SerializableMenuItem[];
}

interface SidebarClientProps {
  user: User | null;
  menuItems: SerializableMenuItem[];
}

function rehydrateMenuIcons(items: SerializableMenuItem[]): MenuItemType[] {
  return items.map(item => ({
    ...item,
    icon: iconMap[item.icon] || Home, // Fallback to a default icon
    children: item.children ? rehydrateMenuIcons(item.children) : undefined,
  }));
}

export function SidebarClient({ user, menuItems }: SidebarClientProps) {
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    openMenus,
    toggleMenu,
  } = useSidebarContext()
  const [hoverExpanded, setHoverExpanded] = useState(false);

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Guest';
  const userInitials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'G';

  const hydratedMenuItems = rehydrateMenuIcons(menuItems);

  const isEffectivelyCollapsed = sidebarCollapsed && !hoverExpanded;

  const handleMouseEnter = () => {
    if (sidebarCollapsed) {
      setHoverExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    setHoverExpanded(false);
  };

  return (
    <>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 overflow-y-auto",
          isEffectivelyCollapsed ? "overflow-x-hidden" : "",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          isEffectivelyCollapsed ? "w-64 lg:w-20" : "w-64"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={cn(
          "flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-700 flex-shrink-0",
          isEffectivelyCollapsed ? "px-4" : "px-6"
        )}>
          <div className="flex items-center">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="User Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{userInitials}</span>
              </div>
            )}
            <span className={cn(
              "ml-3 text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap transition-all duration-300",
              isEffectivelyCollapsed ? "opacity-0 w-0" : "opacity-100"
            )}>
              {userName}
            </span>
          </div>
        </div>

        <nav className={cn("mt-4 space-y-1 flex-1", isEffectivelyCollapsed ? "px-2" : "px-4")}>
          {hydratedMenuItems.map((item) => (
            <MenuItem 
              key={item.id}
              item={item}
              sidebarCollapsed={isEffectivelyCollapsed}
              isOpen={openMenus.has(item.name.toLowerCase())}
              onToggle={toggleMenu}
            />
          ))}
        </nav>
      </div>
    </>
  )
}