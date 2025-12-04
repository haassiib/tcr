'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link' 
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/clsx'
import { MenuItem as MenuItemType } from '@/types/dashboard'
import { useSidebarContext } from '@/contexts/SidebarContext'

interface MenuItemProps {
  item: MenuItemType
  level?: number
  sidebarCollapsed: boolean
  isOpen: boolean
  onToggle: (menuName: string) => void 
}

const isMenuItemActive = (item: MenuItemType, pathname: string): boolean => {
  if (item.href && pathname.startsWith(item.href)) {
    return true;
  }
  if (item.children) {
    return item.children.some(child => isMenuItemActive(child, pathname));
  }
  return false;
};

export function MenuItem({ 
  item, 
  level = 0, 
  sidebarCollapsed, 
  isOpen,
  onToggle
}: MenuItemProps) {
  const menuItemRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const { setSidebarOpen, openMenus, lastOpenedMenu } = useSidebarContext();
  const router = useRouter()
  const pathname = usePathname()
  const Icon = item.icon
  const hasChildren = item.children && item.children.length > 0
  const isLastOpened = hasChildren && isOpen && lastOpenedMenu === item.name.toLowerCase();
  const isActive = isMenuItemActive(item, pathname);

  const handleClick = () => {
    if (hasChildren) {
      onToggle(item.name.toLowerCase())
    } else if (item.href) {
      if (window.innerWidth < 1024) { // lg breakpoint
        setSidebarOpen(false);
      }
      router.push(item.href)
    }
  }

  const handleMouseEnter = () => {
    setIsHovering(true);
  }

  const handleMouseLeave = () => {
    setIsHovering(false);
  }

  useEffect(() => {
    if (sidebarCollapsed && isHovering && hasChildren && menuItemRef.current) {
      const rect = menuItemRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.right}px`,
        zIndex: 9999,
      });
    } else {
      setPopoverStyle({});
    }
  }, [sidebarCollapsed, isHovering, hasChildren]);

  const commonClasses = cn(
    "flex items-center text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer group",
    isActive 
      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
      : isLastOpened
      ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50",
    sidebarCollapsed ? "px-3 py-3 justify-center" : "px-3 py-3",
    level > 0 && !sidebarCollapsed && "ml-6"
  );

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={commonClasses} onClick={handleClick} ref={menuItemRef}>
        <Icon className={cn(
          "w-5 h-5 transition-colors flex-shrink-0",
          isActive 
            ? "text-blue-600 dark:text-blue-400" 
            : isLastOpened
            ? "text-green-600 dark:text-green-400"
            : "text-gray-400"
        )} />
        
        <span className={cn(
          "transition-all duration-300 whitespace-nowrap",
          sidebarCollapsed && !hasChildren
            ? "absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded shadow-lg invisible group-hover:visible z-50"
            : sidebarCollapsed && hasChildren
            ? "opacity-0 w-0"
            : "opacity-100 w-auto ml-3 flex-1"
        )}>
          {item.name}
        </span>

        {hasChildren && !sidebarCollapsed && (
          <ChevronDown className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180"
          )} />
        )}
      </div>

      {hasChildren && !sidebarCollapsed && isOpen && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <MenuItem 
              key={child.name} 
              item={child} 
              level={level + 1}
              sidebarCollapsed={sidebarCollapsed}
              isOpen={openMenus.has(child.name.toLowerCase())}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
      {hasChildren && sidebarCollapsed && isHovering && (
        <div 
          style={popoverStyle}
          className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 space-y-1 ml-2"
        >
          <div className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white">{item.name}</div>
          {item.children!.map((child) => (
            <MenuItem 
              key={child.name} 
              item={child} 
              level={level + 1}
              sidebarCollapsed={false} // Render children as if sidebar is not collapsed
              isOpen={openMenus.has(child.name.toLowerCase())} // Allow nested expansion
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}