'use client'

import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import { useState, useRef, useEffect } from 'react'
import { 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  CreditCard, 
  HelpCircle,
  Mail
} from 'lucide-react'
import { cn } from '@/lib/utils/clsx'
import { User as PrismaUser } from '@prisma/client'

interface UserDropdownProps {
  user: PrismaUser | null;
}

interface UserMenuItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  destructive?: boolean;
  onClick?: () => Promise<void>;
  badge?: string | number;
}

export function UserDropdown({ user }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Guest';
  const userInitials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'G';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const menuItems: UserMenuItem[] = [
    {
      icon: User, // Corrected from User to UserIcon
      label: 'My Profile',
      href: '/dashboard/profile',
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      href: '/dashboard/help',
    },
    {
      icon: LogOut,
      label: 'Sign Out',
      destructive: true,
      onClick: async () => await logout()
    },
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 p-1 rounded-lg transition-colors duration-200",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          isOpen && "bg-gray-100 dark:bg-gray-700"
        )}
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="User Avatar" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">{userInitials}</span>
          </div>
        )}
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="User Avatar" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{userInitials}</span>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              const commonClasses = cn(
                "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors duration-200 text-left",
                "hover:bg-gray-50 dark:hover:bg-gray-700/50",
                item.destructive 
                  ? "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" 
                  : "text-gray-700 dark:text-gray-300"
              );

              if (item.href) {
                return (
                  <Link href={item.href} key={item.label} className={commonClasses} onClick={() => setIsOpen(false)}>
                    <Icon className={cn("w-4 h-4", "text-gray-400")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              }

              return (
                <button key={item.label} className={commonClasses} onClick={async () => {
                  setIsOpen(false);
                  if (item.onClick) {
                    await item.onClick();
                  }
                }}>
                  <Icon className={cn("w-4 h-4", item.destructive ? "text-red-500" : "text-gray-400")} />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Section */}
          {/* <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Version 1.0.0</span>
              <span>© 2024 TCAdmin</span>
            </div>
          </div> */}
        </div>
      )}
    </div>
  )
}