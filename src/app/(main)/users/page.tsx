'use client';

import { useState, useMemo, useEffect } from 'react';
import { User, Role } from '@prisma/client';
import Link from 'next/link';
import UserForm from './UserForm';
import { toggleUserStatus, getUsersPageData } from './actions';
import { Eye, Pencil, Search, ChevronsUpDown, ArrowUp, ArrowDown, X, Home } from 'lucide-react';
import UserView from './UserView';
import { Pagination } from '@/components/ui/Pagination';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

type UserWithRelations = User & {
  userRoles: { role: Role }[];
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithRelations[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRelations | null>(null);
  const [viewSidebarOpen, setViewSidebarOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserWithRelations | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { users, roles, userPermissions } = await getUsersPageData();
        setUsers(users as UserWithRelations[]);
        setRoles(roles);
        setUserPermissions(new Set(userPermissions));
      } catch (error) {
        console.error("Failed to fetch users page data", error);
        if (error instanceof Error && error.message === 'Unauthorized') {
          router.push('/unauthorized');
        } else {
          toast.error('Failed to load users.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]); // Refetch when form closes

  const routePath = pathname.split('/').pop() || 'users';
  const canCreate = userPermissions.has(`${routePath}:create`);
  const canUpdate = userPermissions.has(`${routePath}:update`);

  const handleNewUser = () => {
    setEditingUser(null);
    setSidebarOpen(true);
  };

  const handleEditUser = (user: UserWithRelations) => {
    setEditingUser(user);
    setSidebarOpen(true);
  };

  const handleViewUser = (user: UserWithRelations) => {
    setViewingUser(user);
    setViewSidebarOpen(true);
  }

  const handleToggleStatus = async (id: number) => {
    const result = await toggleUserStatus({ id, routePath });
    if ('error' in result && result.error) {
      toast.error('Operation Failed', { description: result.error });
    } else {
      toast.success('User status updated.');
      setUsers(users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = useMemo(() => {
    let sortableUsers = [...users];
    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'name') {
          aValue = `${a.firstName} ${a.lastName}`;
          bValue = `${b.firstName} ${b.lastName}`;
        } else if (sortConfig.key === 'status') {
          aValue = a.isActive;
          bValue = b.isActive;
        } else {
          aValue = a[sortConfig.key as keyof User];
          bValue = b[sortConfig.key as keyof User];
        }

        if (aValue === null) return -1;
        if (bValue === null) return 1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableUsers;
  }, [users, sortConfig]);

  const filteredUsers = sortedUsers.filter(user =>
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.phone && user.phone.includes(searchQuery)) ||
    user.userRoles.some(ur => ur.role.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Users</h1></div></li>
        </ol>
      </nav>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users..."
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
          <button onClick={handleNewUser} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 self-start md:self-auto">
            + New User
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center">
                  Name
                  {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />) : <ChevronsUpDown size={14} className="ml-2" />}
                </div>
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('email')}>
                <div className="flex items-center">
                  Email
                  {sortConfig?.key === 'email' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />) : <ChevronsUpDown size={14} className="ml-2" />}
                </div>
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Roles
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center">
                  Status
                  {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />) : <ChevronsUpDown size={14} className="ml-2" />}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
            ) : paginatedUsers.map(user => (
              <tr key={user.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-gray-600">
                  {user.email}
                </td>
                <td className="px-2 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.userRoles.map(ur => (
                      <span key={ur.role.id} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                        {ur.role.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-3 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <button onClick={() => handleViewUser(user)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors">
                    <Eye size={18} />
                  </button>
                  {canUpdate && (
                    <>
                      <button onClick={() => handleEditUser(user)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors mr-2" title="Edit user">
                        <Pencil size={18} />
                      </button>
                      <label htmlFor={`toggle-status-${user.id}`} className="inline-flex items-center cursor-pointer">
                        <input id={`toggle-status-${user.id}`} type="checkbox" className="sr-only" checked={user.isActive} onChange={() => handleToggleStatus(user.id)} />
                        <div className={`relative w-11 h-6 rounded-full ${user.isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${user.isActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                      </label>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        totalItems={filteredUsers.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={setItemsPerPage}
        itemType="Users"
      />

      <UserForm
        user={editingUser as any}
        roles={roles}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        canCreate={canCreate}
        canUpdate={canUpdate}
        routePath={routePath}
      />

      <UserView
        user={viewingUser}
        isOpen={viewSidebarOpen}
        onClose={() => setViewSidebarOpen(false)}
      />
    </div>
  );
}