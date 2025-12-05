'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Vendor, Brand, User } from '@prisma/client';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import { Pagination } from '@/components/ui/Pagination';
import VendorForm from './VendorForm';
import { Pencil, Search, ChevronsUpDown, ArrowUp, ArrowDown, X, Home } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getVendorsPageData } from './actions';

type VendorWithRelations = Vendor & { brand: Brand, user: User };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorWithRelations[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [pageInput, setPageInput] = useState(currentPage.toString());
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { vendors, brands, users, userPermissions } = await getVendorsPageData();
      setVendors(vendors as any);
      setBrands(brands);
      setUsers(users);
      setUserPermissions(new Set(userPermissions));
    } catch (error) {
      console.error("Failed to fetch vendors page data", error);
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          router.push('/unauthorized');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canCreate = userPermissions.has('vendors:create');
  const canUpdate = userPermissions.has('vendors:update');

  const handleNewVendor = () => {
    setEditingVendor(null);
    setSidebarOpen(true);
  };

  const handleEditVendor = (vendor: VendorWithRelations) => {
    setEditingVendor(vendor);
    setSidebarOpen(true);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedVendors = useMemo(() => {
    let sortableVendors = [...vendors];
    if (sortConfig !== null) {
      sortableVendors.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'brand') {
          aValue = a.brand?.name ?? '';
          bValue = b.brand?.name ?? '';
        } else if (sortConfig.key === 'user') {
          aValue = a.user ? `${a.user.firstName} ${a.user.lastName}` : '';
          bValue = b.user ? `${b.user.firstName} ${b.user.lastName}` : '';
        } else {
          aValue = a[sortConfig.key as keyof Vendor];
          bValue = b[sortConfig.key as keyof Vendor];
        }

        if (aValue === null) return -1;
        if (bValue === null) return 1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableVendors;
  }, [vendors, sortConfig]);

  const filteredVendors = useMemo(() => {
    return sortedVendors.filter(vendor => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.brand && vendor.brand.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (vendor.description && vendor.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (vendor.user && `${vendor.user.firstName} ${vendor.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesBrand = selectedBrandId ? vendor.brandId.toString() === selectedBrandId : true;
      return matchesSearch && matchesBrand;
    });
  }, [sortedVendors, searchQuery, selectedBrandId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBrandId, itemsPerPage]);

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const paginatedVendors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVendors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVendors, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleFormClose = () => {
    setSidebarOpen(false);
    fetchData(); // Refetch data when form closes
  };

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
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Vendors</h1></div></li>
        </ol>
      </nav>

      <div className="flex justify-end">
        {canCreate && (
          <button onClick={handleNewVendor} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
            + New Vendor
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search vendors..."
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
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <AutocompleteDropdown
            className="w-full sm:w-64"
            options={brands.map(brand => ({ value: brand.id.toString(), label: brand.name }))}
            value={selectedBrandId}
            onChange={setSelectedBrandId}
            placeholder="All Brands"
            searchPlaceholder="Search brand..."
            emptyText="No brand found."
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('name')}><div className="flex items-center">Name{renderSortIcon('name')}</div></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('brand')}><div className="flex items-center">Brand{renderSortIcon('brand')}</div></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('user')}><div className="flex items-center">User{renderSortIcon('user')}</div></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('isActive')}><div className="flex items-center">Status{renderSortIcon('isActive')}</div></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
            ) : paginatedVendors.map(vendor => (
              <tr key={vendor.id}>
                <td className="px-6 py-2 whitespace-nowrap">{vendor.name}</td>
                <td className="px-6 py-2 whitespace-nowrap text-gray-600">{vendor.description ?? 'N/A'}</td>
                <td className="px-6 py-2 whitespace-nowrap text-gray-600">{vendor.brand?.name ?? 'N/A'}</td>
                <td className="px-6 py-2 whitespace-nowrap text-gray-600">{vendor.user ? `${vendor.user.firstName} ${vendor.user.lastName}` : 'N/A'}</td>
                <td className="px-6 py-2 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm">
                  {canUpdate && (
                    <button onClick={() => handleEditVendor(vendor)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit vendor">
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
        totalItems={filteredVendors.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={setItemsPerPage}
        itemType="Vendors"
      />

      <VendorForm
        vendor={editingVendor}
        brands={brands}
        users={users}
        isOpen={sidebarOpen}
        onClose={handleFormClose}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />
    </div>
  );
}
