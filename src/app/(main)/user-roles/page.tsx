'use client';

import { useState, useEffect, useMemo } from 'react';
import { UserRole, User, Role } from '@prisma/client';
import Link from 'next/link';
import { Home, Pencil, Search, X } from 'lucide-react';
import AssignRoleForm from './AssignRoleForm';
import { getUserRolesPageData } from './actions';
import { Pagination } from '@/components/ui/Pagination';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

type UserRoleWithRelations = UserRole & { user: Pick<User, 'firstName' | 'lastName'>; role: Pick<Role, 'name'> };

export default function UserRolesPage() {
  const [userRoles, setUserRoles] = useState<UserRoleWithRelations[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<UserRoleWithRelations | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { userRoles, allUsers, allRoles, userPermissions } = await getUserRolesPageData();
        setUserRoles(userRoles as UserRoleWithRelations[]);
        setAllUsers(allUsers);
        setAllRoles(allRoles);
        setUserPermissions(new Set(userPermissions));
      } catch (error) {
        console.error("Failed to fetch user roles page data", error);
        if (error instanceof Error && error.message === 'Unauthorized') {
          router.push('/unauthorized');
        } else {
          toast.error('Failed to load page data.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [sidebarOpen, router]); // Refetch when form closes

  const routePath = pathname.split('/').pop() || 'user-roles';
  const canAssignRoles = userPermissions.has(`${routePath}:assign`);

  const handleNewAssignment = () => {
    setEditingAssignment(null);
    setSidebarOpen(true);
  };

  const handleEditAssignment = (assignment: UserRoleWithRelations) => {
    const userAssignments = userRoles.filter(ur => ur.userId === assignment.userId);
    const userWithAllRoles = {
      ...assignment,
      allRoleIds: userAssignments.map(ur => ur.roleId.toString()),
    };
    setEditingAssignment(userWithAllRoles as any);
    setSidebarOpen(true);
  };

  const filteredUserRoles = userRoles.filter(ur =>
    `${ur.user.firstName} ${ur.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ur.role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const paginatedUserRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUserRoles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUserRoles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUserRoles.length / itemsPerPage);

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
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">User Role Assignments</h1></div></li>
        </ol>
      </nav>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by user or role..."
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
        {canAssignRoles && (
          <button onClick={handleNewAssignment} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 self-start md:self-auto">
            + Assign Role
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
            ) : paginatedUserRoles.map(ur => (
              <tr key={ur.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{ur.user.firstName} {ur.user.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ur.role.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{new Date(ur.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {canAssignRoles && (
                    <button onClick={() => handleEditAssignment(ur)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit assignment">
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
        totalItems={filteredUserRoles.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={setItemsPerPage}
        itemType="Assignments"
      />

      {sidebarOpen && (
        <AssignRoleForm
          users={allUsers}
          roles={allRoles}
          assignment={editingAssignment}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          canAssign={canAssignRoles}
          routePath={routePath}
        />
      )}
    </div>
  );
}