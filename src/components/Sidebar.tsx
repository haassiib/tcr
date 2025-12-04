import { getUserPermissions } from '@/lib/auth/authorization';
import { SidebarClient } from './SidebarClient';
import { User, Menu as MenuModel, Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import * as Icons from 'lucide-react';

interface SerializableMenuItem {
  id: number;
  name: string;
  href?: string;
  icon: string;
  active?: boolean;
  children?: SerializableMenuItem[];
}

interface SidebarProps {
  user: User | null;
}

function buildMenuTree(
  menus: MenuModel[],
  userPermissions: Set<string>,
  parentId: number | null = null,
): SerializableMenuItem[] {
  return menus
    .filter(menu => menu.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .reduce((acc, menu) => {      const children = buildMenuTree(menus, userPermissions, menu.id);

      // A menu item is visible if it has children or if the user has permission for it.
      const hasViewPermission = menu.href
        ? userPermissions.has(`${menu.href.split('/').pop()}:view`)
        : true; // Always allow parent menus to be checked if they have visible children.

      if (children.length > 0 || (menu.href && hasViewPermission)) {
        if (!menu.href && children.length === 0) {
          // Don't show parent menus with no visible children
          return acc;
        }
      } else if (!menu.href) {
        return acc; // Don't show parent if it has no children and no link
      } else if (!hasViewPermission) {
        return acc; // Don't show item if user lacks permission
      }

      const iconName = menu.icon as keyof typeof Icons;
      const IconComponent = Icons[iconName] || Icons.Circle;

      acc.push({ 
        id: menu.id, 
        name: menu.name, 
        href: menu.href || undefined, 
        icon: IconComponent.displayName || 'Circle', 
        children,
      });
      return acc;
    }, [] as SerializableMenuItem[]);
}

export async function Sidebar({ user }: SidebarProps) {
  const allMenus = await prisma.menu.findMany({
    orderBy: { order: 'asc' },
  });

  let userPermissions = new Set<string>();
  if (user) {
    userPermissions = await getUserPermissions(user.id);
  }

  const serializableMenuItems = buildMenuTree(allMenus, userPermissions);

  return <SidebarClient user={user} menuItems={serializableMenuItems} />;
}