'use client';

import { useState, useMemo, useEffect } from 'react';
import { Brand } from '@prisma/client';
import { Pagination } from '@/components/ui/Pagination';
import BrandForm from './BrandForm';
import { Pencil, Search, ChevronsUpDown, ArrowUp, ArrowDown, X, Home } from 'lucide-react';
import Link from 'next/link';
import { getBrandsPageData } from './actions'; 
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchBrands() {
      setLoading(true);
      try {
        const { brands, userPermissions } = await getBrandsPageData();
        setBrands(brands);
        setUserPermissions(new Set(userPermissions));
      } catch (error) {
        console.error("Failed to fetch brands", error);
        if (error instanceof Error && error.message === 'Unauthorized') {
          router.push('/unauthorized');
        } else {
          toast.error('Failed to load brands.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchBrands();
  }, [sidebarOpen, router]); // Refetch when form closes

  const routePath = pathname.split('/').pop() || 'brands';
  const canCreate = userPermissions.has(`${routePath}:create`);
  const canUpdate = userPermissions.has(`${routePath}:update`);

  const handleNewBrand = () => {
    setEditingBrand(null);
    setSidebarOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setSidebarOpen(true);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedBrands = useMemo(() => {
    let sortableBrands = [...brands];
    if (sortConfig !== null) {
      sortableBrands.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof Brand];
        const bValue = b[sortConfig.key as keyof Brand];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableBrands;
  }, [brands, sortConfig]);

  const filteredBrands = useMemo(() => {
    return sortedBrands.filter(brand =>
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (brand.description && brand.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [sortedBrands, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const paginatedBrands = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBrands.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBrands, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredBrands.length / itemsPerPage);

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
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Brands</h1></div></li>
        </ol>
      </nav>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search brands..."
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
          <button onClick={handleNewBrand} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 self-start md:self-auto">
            + New Brand
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('name')}><div className="flex items-center">Name{sortConfig?.key === 'name' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />}</div></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('isActive')}><div className="flex items-center">Status{sortConfig?.key === 'isActive' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />}</div></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
            ) : paginatedBrands.map(brand => (
              <tr key={brand.id}>
                <td className="px-6 py-2 whitespace-nowrap">{brand.name}</td>
                <td className="px-6 py-2 whitespace-nowrap text-gray-600">{brand.description}</td>
                <td className="px-6 py-2 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${brand.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{brand.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="px-6 py-2 whitespace-nowrap text-sm">
                  {canUpdate && (
                    <button onClick={() => handleEditBrand(brand)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit brand">
                      <Pencil size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination totalItems={filteredBrands.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={handlePageChange} onItemsPerPageChange={setItemsPerPage} itemType="Brands" />
      {sidebarOpen && (
        <BrandForm brand={editingBrand} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} canCreate={canCreate} canUpdate={canUpdate} routePath={routePath} />
      )}
    </div>
  );
}