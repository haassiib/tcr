'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Menu as MenuType } from '@prisma/client';
import { Pagination } from '@/components/ui/Pagination';
import MenuForm from './MenuForm';
import { Pencil, Search, ChevronsUpDown, ArrowUp, ArrowDown, X, Home } from 'lucide-react';
import Link from 'next/link';
import { getMenusPageData } from './actions'; 
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

type MenuWithRelations = MenuType & { parent: MenuType | null };

export default function MenusPage() {
  const [allMenus, setAllMenus] = useState<MenuWithRelations[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'order', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const router = useRouter();
  const pathname = usePathname();
  
    const fetchData =  useCallback(async () => {
      setLoading(true);
      try {
        const { allMenus, userPermissions } = await getMenusPageData();
        setAllMenus(allMenus as MenuWithRelations[]);
        setUserPermissions(new Set(userPermissions));
      } catch (error) {
        console.error("Failed to fetch menus page data", error);
        if (error instanceof Error && error.message === 'Unauthorized') {
          router.push('/unauthorized');
        } else {
          toast.error('Failed to load menus.');
        }
      } finally {
        setLoading(false);
      }
    }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData, sidebarOpen]); // Refetch when form closes

  const routePath = pathname.split('/').pop() || 'menus';
  const canCreate = userPermissions.has(`${routePath}:create`);
  const canUpdate = userPermissions.has(`${routePath}:update`);

  const handleNewMenu = useCallback(() => {
    setEditingMenu(null);
    setSidebarOpen(true);
  }, []);

  const handleEditMenu = useCallback((menu: MenuWithRelations) => {
    setEditingMenu(menu);
    setSidebarOpen(true);
  }, []);

  const handleSort = useCallback((key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  const buildGroupedList = useCallback((menus: MenuWithRelations[], parentId: number | null = null, level = 0): (MenuWithRelations & { level: number })[] => {
    const items = menus
      .filter(menu => menu.parentId === parentId)
      .sort((a, b) => {
        if (!sortConfig) return a.order - b.order;
        const { key, direction } = sortConfig;
        const aValue = a[key as keyof MenuType];
        const bValue = b[key as keyof MenuType];

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
      });

    let result: (MenuWithRelations & { level: number })[] = [];
    for (const item of items) {
      result.push({ ...item, level });
      result = result.concat(buildGroupedList(menus, item.id, level + 1)); // Recursive call is fine here
    }
    return result;
  }, [sortConfig]);

  const sortedMenus = useMemo(() => {
    let sortableItems = [...allMenus];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'parent') {
          aValue = a.parent?.name ?? '';
          bValue = b.parent?.name ?? '';
        } else {
          aValue = a[sortConfig.key as keyof MenuType];
          bValue = b[sortConfig.key as keyof MenuType];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [allMenus, sortConfig]);

  const filteredMenus = useMemo(() => {
    return sortedMenus.filter(menu => {
      return menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (menu.href && menu.href.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (menu.parent && menu.parent.name.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [sortedMenus, searchQuery]);

  const displayedMenus = useMemo(() => {
    if (searchQuery) return filteredMenus.map(m => ({ ...m, level: 0 }));
    return buildGroupedList(filteredMenus, null, 0);
  }, [sortConfig, searchQuery, filteredMenus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const paginatedMenus = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return displayedMenus.slice(startIndex, startIndex + itemsPerPage);
  }, [displayedMenus, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(displayedMenus.length / itemsPerPage);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ChevronsUpDown size={14} className="ml-2" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />;
  };

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="text-gray-500 hover:text-gray-700 flex items-center">
              <Home className="h-4 w-4 mr-2" /> Dashboard
            </Link>
          </li>
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Menus</h1></div></li>
        </ol>
      </nav>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search menus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Clear search">
              <X size={20} />
            </button>
          )}
        </div>
        {canCreate && (
          <button onClick={handleNewMenu} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 self-start md:self-auto">
            + New Menu
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('order')}><div className="flex items-center">Order{renderSortIcon('order')}</div></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('name')}><div className="flex items-center">Name{renderSortIcon('name')}</div></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('href')}><div className="flex items-center">Path{renderSortIcon('href')}</div></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('parent')}><div className="flex items-center">Parent{renderSortIcon('parent')}</div></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
            ) : paginatedMenus.map(menu => (
              <tr key={menu.id}>
                <td className="px-6 py-2 whitespace-nowrap text-center">
                    <span style={{ paddingLeft: `${menu.level * 1.5}rem` }}>
                        {menu.order}
                    </span>
                </td>
                <td className="px-6 py-2 whitespace-nowrap font-medium">
                  <span style={{ paddingLeft: `${menu.level * 1.5}rem` }}>
                    {menu.name}
                  </span>
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-gray-600 font-mono">{menu.href ?? 'N/A'}</td>
                <td className="px-6 py-2 whitespace-nowrap text-gray-600">{menu.parent?.name ?? <span className="text-gray-400">Top-level</span>}</td>
                <td className="px-6 py-2 whitespace-nowrap text-sm">
                  {canUpdate && (
                    <button onClick={() => handleEditMenu(menu)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit menu">
                      <Pencil size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        totalItems={displayedMenus.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={setItemsPerPage}
        itemType="Menus"
      />

      {sidebarOpen && (
        <MenuForm
          menu={editingMenu}
          allMenus={allMenus}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          canCreate={canCreate}
          canUpdate={canUpdate}
          routePath={routePath} />
      )}
    </div>
  );
}