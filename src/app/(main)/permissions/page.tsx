'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Permission, Role, Menu } from '@prisma/client';
import { Pencil, Eye, Trash2, Search, X, Home } from 'lucide-react';
import { deletePermission, getPermissionsPageData } from './actions';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import PermissionForm from './PermissionForm';
import { Pagination } from '@/components/ui/Pagination';
import ConfirmationPopover from '@/components/ui/ConfirmationPopover';

type PermissionWithRelations = Permission & {
  rolePermissions: { role: Role }[];
};

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionWithRelations[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [menuNames, setMenuNames] = useState<{ value: string, label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionWithRelations | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const router = useRouter();
  const pathname = usePathname();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { permissions, userPermissions, menuNames } = await getPermissionsPageData();
      setPermissions(permissions as any);
      setUserPermissions(new Set(userPermissions));
      setMenuNames(menuNames);
    } catch (error) {
      console.error("Failed to fetch permissions data:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const routePath = pathname.split('/').pop() || 'permissions';
  const canCreate = userPermissions.has(`${routePath}:create`);
  const canUpdate = userPermissions.has(`${routePath}:update`);
  const canDelete = userPermissions.has(`${routePath}:delete`);

  const handleNewPermission = () => {
    setEditingPermission(null);
    setSidebarOpen(true);
  };

  const handleEditPermission = (permission: PermissionWithRelations) => {
    setEditingPermission(permission);
    setSidebarOpen(true);
  };

  const handleDeletePermission = async (id: number) => {
    // The popover's onConfirm will trigger this directly
    await deletePermission({ id, routePath });
    fetchData();
  };

  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission =>
      permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (permission.description && permission.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [permissions, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const paginatedPermissions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPermissions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPermissions, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= Math.ceil(filteredPermissions.length / itemsPerPage)) {
      setCurrentPage(page);
    }
  };

  const handleFormClose = () => {
    setSidebarOpen(false);
    fetchData();
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
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Permissions</h1></div></li>
        </ol>
      </nav>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search permissions..."
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
          <button onClick={handleNewPermission} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 self-start md:self-auto">
            + New Permission
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permission</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned to</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
            ) : paginatedPermissions.map(permission => (
              <tr key={permission.id}>
                <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{permission.name}</td>
                <td className="px-2 py-3 text-gray-600">{permission.description}</td>
                <td className="px-2 py-3">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {permission.rolePermissions.length > 0 ? permission.rolePermissions.map(rp => (
                      <span key={rp.role.id} className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {rp.role.name}
                      </span>
                    )) : <span className="text-xs text-gray-500">Not assigned</span>}
                  </div>
                </td>
                <td className="px-4 flex py-3 whitespace-nowrap text-sm">
                  {canUpdate && (
                    <button onClick={() => handleEditPermission(permission)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100" title="Edit permission">
                      <Pencil size={18} />
                    </button>
                  )}
                  {canDelete && (
                    <ConfirmationPopover onConfirm={() => handleDeletePermission(permission.id)} title="Delete Permission?" description="This will be permanently removed from all roles." confirmText="Delete">
                      <button className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100" title="Delete permission">
                        <Trash2 size={18} />
                      </button>
                    </ConfirmationPopover>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        totalItems={filteredPermissions.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={setItemsPerPage}
        itemType="Permissions"
      />

      <PermissionForm
        permission={editingPermission}
        isOpen={sidebarOpen}
        onClose={handleFormClose}
        canCreate={canCreate}
        canUpdate={canUpdate}
        menuNames={menuNames}
        routePath={routePath}
      />

    </div>
  );
}