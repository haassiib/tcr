'use client';

import { useState, useMemo, useEffect } from 'react';
import { Vendor, VendorMonthlyBalance, Brand } from '@prisma/client';
import { Pagination } from '@/components/ui/Pagination';
import BalanceForm from './BalanceForm';
import { Pencil, Search, ChevronsUpDown, ArrowUp, ArrowDown, X, Home } from 'lucide-react';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getBalancesPageData } from './actions';

type BalanceWithVendor = VendorMonthlyBalance & { vendor: { name: string; brand: { id: number; name: string } } };

export default function BalancePage() {
  const [balances, setBalances] = useState<BalanceWithVendor[]>([]);
  const [vendors, setVendors] = useState<(Vendor & { brandId: number })[]>([]);
  const [brands, setBrands] = useState<Pick<Brand, 'id' | 'name'>[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<BalanceWithVendor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'year', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { balances, vendors, brands, userPermissions } = await getBalancesPageData();
        setBalances(balances as any);
        setVendors(vendors);
        setBrands(brands);
        setUserPermissions(new Set(userPermissions));
      } catch (error) {
        console.error("Failed to fetch balance page data", error);
        if (error instanceof Error) {
          if (error.message === 'Unauthorized') {
            router.push('/unauthorized');
          }
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [sidebarOpen, router]); // Refetch when form closes

  const routePath = pathname.split('/').pop() || 'balances';
  const canCreate = userPermissions.has(`${routePath}:create`);
  const canUpdate = userPermissions.has(`${routePath}:update`);

  const handleNewBalance = () => {
    setEditingBalance(null);
    setSidebarOpen(true);
  };

  const handleEditBalance = (balance: BalanceWithVendor) => {
    setEditingBalance(balance);
    setSidebarOpen(true);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedBalances = useMemo(() => {
    let sortableBalances = [...balances];
    if (sortConfig !== null) {
      sortableBalances.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'vendorName') {
          aValue = a.vendor.name;
          bValue = b.vendor.name;
        } else if (sortConfig.key === 'brandName') {
          aValue = a.vendor.brand.name;
          bValue = b.vendor.brand.name;
        } else {
          aValue = a[sortConfig.key as keyof VendorMonthlyBalance];
          bValue = b[sortConfig.key as keyof VendorMonthlyBalance];
        }

        if (aValue === null) return -1;
        if (bValue === null) return 1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        
        if (sortConfig.key === 'year' && a.year === b.year) {
          return b.month - a.month;
        }

        return 0;
      });
    }
    return sortableBalances;
  }, [balances, sortConfig]);

  const filteredBalances = useMemo(() => {
    return sortedBalances.filter(balance =>
      (searchQuery === '' ||
        balance.vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        balance.vendor.brand.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!brandId || balance.vendor.brand.id === parseInt(brandId, 10)) &&
      (!vendorId || balance.vendorId === parseInt(vendorId, 10))
    );
  }, [sortedBalances, searchQuery, brandId, vendorId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, brandId, vendorId]);

  useEffect(() => {
    setVendorId(null);
  }, [brandId]);

  const paginatedBalances = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBalances.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBalances, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredBalances.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatMonthYear = (month: number, year: number) => {
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const brandOptions = brands.map(brand => ({
    value: String(brand.id),
    label: brand.name,
  }));

  const vendorOptions = useMemo(() => {
    let availableVendors = vendors;
    if (brandId) {
      availableVendors = vendors.filter(vendor => vendor.brandId === parseInt(brandId, 10));
    }
    return availableVendors.map(vendor => ({
      value: String(vendor.id),
      label: vendor.name,
    }));
  }, [vendors, brandId]);

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="text-gray-500 hover:text-gray-700 flex items-center">
              <Home className="h-4 w-4 mr-2" /> Dashboard
            </Link>
          </li>
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Monthly Balances</h1></div></li>
        </ol>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search Input - Left Side */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by vendor or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Clear search">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Filters and Button - Right Side */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-64">
            <AutocompleteDropdown
              options={brandOptions}
              value={brandId}
              onChange={setBrandId}
              placeholder="All Brands"
              searchPlaceholder="Search brands..."
              emptyText="No brands found."
            />
          </div>
          <div className="w-full sm:w-64">
            <AutocompleteDropdown
              options={vendorOptions}
              value={vendorId}
              onChange={setVendorId}
              placeholder="All Vendors"
              searchPlaceholder="Search vendors..."
              emptyText="No vendors found."
              disabled={vendorOptions.length === 0}
            />
          </div>
        </div>
      </div>

      {canCreate && (
        <div className="flex justify-end">
          <button onClick={handleNewBalance} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
            + New Balance Entry
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('brandName')}>
                <div className="flex items-center">Brand Name{sortConfig?.key === 'brandName' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />) : <ChevronsUpDown size={14} className="ml-2" />}</div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('vendorName')}>
                <div className="flex items-center">Vendor Name{sortConfig?.key === 'vendorName' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />) : <ChevronsUpDown size={14} className="ml-2" />}</div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('year')}>
                <div className="flex items-center">Month / Year{sortConfig?.key === 'year' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />) : <ChevronsUpDown size={14} className="ml-2" />}</div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('closingBalance')}>
                <div className="flex items-center">Closing Balance{sortConfig?.key === 'closingBalance' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />) : <ChevronsUpDown size={14} className="ml-2" />}</div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
            ) : paginatedBalances.map(balance => (
              <tr key={balance.id}>
                <td className="px-6 py-2 whitespace-nowrap font-medium text-gray-800">{balance.vendor.brand.name}</td>
                <td className="px-6 py-2 whitespace-nowrap">{balance.vendor.name}</td>
                <td className="px-6 py-2 whitespace-nowrap text-gray-600">{formatMonthYear(balance.month, balance.year)}</td>
                <td className="px-6 py-2 whitespace-nowrap text-gray-600">${Number(balance.closingBalance).toFixed(2)}</td>
                <td className="px-6 py-2 whitespace-nowrap text-sm">
                  {canUpdate && (
                    <button onClick={() => handleEditBalance(balance)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit balance">
                      <Pencil size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination totalItems={filteredBalances.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={handlePageChange} onItemsPerPageChange={setItemsPerPage} itemType="Balances" />

      <BalanceForm
        balance={editingBalance}
        vendors={vendors}
        brands={brands}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        canCreate={canCreate}
        canUpdate={canUpdate}
        routePath={routePath} />
    </div>
  );
}