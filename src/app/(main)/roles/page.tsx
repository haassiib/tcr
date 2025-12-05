'use client';

import { useState, useMemo, useEffect } from 'react';
import { Role, Permission } from '@prisma/client';
import { Pencil, Eye, Trash2, Search, ChevronsUpDown, ArrowUp, ArrowDown, X, Home } from 'lucide-react'; 
import { useRouter, usePathname } from 'next/navigation';
import RoleForm from './RoleForm';
import Link from 'next/link';
import { deleteRole, getRolesPageDataWithPermissions } from './actions';
import RoleView from './RoleView';
import { Pagination } from '@/components/ui/Pagination';

type RoleWithPermissions = Role & {
  rolePermissions: { permission: Permission }[];
  userRoles: any[];
};

export default function RolesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [viewSidebarOpen, setViewSidebarOpen] = useState(false);
  const [viewingRole, setViewingRole] = useState<RoleWithPermissions | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const { roles, permissions, userPermissions } = await getRolesPageDataWithPermissions();
      setRoles(roles as any);
      setPermissions(permissions);
      setUserPermissions(new Set(userPermissions));
    } catch (error) {
      console.error("Failed to fetch roles page data", error);
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          router.push('/unauthorized');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const routePath = pathname.split('/').pop() || 'roles';
  const canCreate = userPermissions.has(`${routePath}:create`);
  const canUpdate = userPermissions.has(`${routePath}:update`);
  const canDelete = userPermissions.has(`${routePath}:delete`);

  const handleNewRole = () => {
    setEditingRole(null);
    setSidebarOpen(true);
  };

  const handleEditRole = (role: RoleWithPermissions) => {
    setEditingRole(role);
    setSidebarOpen(true);
  };

  const handleViewRole = (role: RoleWithPermissions) => {
    setViewingRole(role);
    setViewSidebarOpen(true);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRoles(roles.filter(r => r.name !== 'admin').map(r => r.id));
    } else {
      setSelectedRoles([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedRoles(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
  }

  const handleDeleteRole = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      await deleteRole({ id, routePath });
      fetchData(); // Refetch data after deletion
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedRoles = useMemo(() => {
    let sortableRoles = [...roles];
    if (sortConfig !== null) {
      sortableRoles.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'users') {
          aValue = a.userRoles.length;
          bValue = b.userRoles.length;
        } else {
          aValue = a[sortConfig.key as keyof Role];
          bValue = b[sortConfig.key as keyof Role];
        }

        if (aValue === null) return -1;
        if (bValue === null) return 1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableRoles;
  }, [roles, sortConfig]);

  const filteredRoles = sortedRoles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    role.rolePermissions.some(rp => rp.permission.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const paginatedRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRoles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRoles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleFormClose = () => {
    setSidebarOpen(false);
    fetchData(); // Refetch data when form closes
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
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Roles</h1></div></li>
        </ol>
      </nav>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={20} />
            </button>
          )}
        </div>
        {canCreate && (
          <button onClick={handleNewRole} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 self-start md:self-auto">
            + New Role
          </button>
        )}
      </div>

      {/* Roles Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-2 text-left">
                <input type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" onChange={handleSelectAll} checked={roles.length > 1 && selectedRoles.length === filteredRoles.filter(r => r.name !== 'admin').length} />
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center">
                  Role
                  {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />) : <ChevronsUpDown size={14} className="ml-2" />}
                </div>
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Permissions
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('users')}>
                <div className="flex items-center">
                  Users
                  {sortConfig?.key === 'users' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />) : <ChevronsUpDown size={14} className="ml-2" />}
                </div>
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
            ) : paginatedRoles.map(role => (
              <tr key={role.id}>
                <td className="px-6 py-2">
                  {role.name !== 'admin' && <input type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" onChange={() => handleSelectOne(role.id)} checked={selectedRoles.includes(role.id)} />}
                </td>
                <td className="px-6 py-2 whitespace-nowrap font-medium">{role.name}</td>
                 <td className="px-6 py-4 text-gray-600 max-w-md">
                  <div className="flex flex-wrap gap-1">
                    {role.rolePermissions.slice(0, 3).map(({ permission }) => (
                      <span key={permission.id} className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {permission.name}
                      </span>
                    ))}
                    {role.rolePermissions.length > 3 && (
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        +{role.rolePermissions.length - 3} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-2 whitespace-nowrap">
                  {role.userRoles.length} user{role.userRoles.length !== 1 ? 's' : ''}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm">
                  <button onClick={() => handleViewRole(role)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="View role">
                    <Eye size={18} />
                  </button>
                  {role.name !== 'admin' && (
                    <>
                      <button onClick={() => handleEditRole(role)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit role">
                        <Pencil size={18} />
                      </button>
                      {canDelete && (
                        <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors" title="Delete role">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        totalItems={filteredRoles.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={setItemsPerPage}
        itemType="Roles"
      />

      <RoleForm
        role={editingRole}
        permissions={permissions}
        isOpen={sidebarOpen}
        onClose={handleFormClose}
        canCreate={canCreate}
        canUpdate={canUpdate}
        routePath={routePath}
      />

      <RoleView
        role={viewingRole}
        isOpen={viewSidebarOpen}
        onClose={() => setViewSidebarOpen(false)}
      />
    </div>
  );
}