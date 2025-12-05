'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Vendor, Brand, DepositorRetention } from '@prisma/client';
import { Pagination } from '@/components/ui/Pagination';
import DepositorRetentionForm from './DepositorRetentionForm';
import { Pencil, Search, ChevronsUpDown, ArrowUp, ArrowDown, X, Home, Trash2 } from 'lucide-react';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getDepositorRetentionPageData, deleteDepositorRetention } from './actions';
import ConfirmationPopover from '@/components/ui/ConfirmationPopover';
import { toast } from 'sonner';

type RetentionEntryWithRelations = DepositorRetention & { vendor: { name: string; brand: { id: number; name: string } } };

interface GroupedRetentionEntry {
  groupKey: string; // e.g., "vendorId-year-month"
  vendorId: number;
  vendorName: string;
  brandName: string;
  month: number;
  year: number;
  percentages: Record<string, number | undefined>;
  originalEntries: RetentionEntryWithRelations[];
}

export default function DepositorRetentionPage() {
  const [retentionEntries, setRetentionEntries] = useState<RetentionEntryWithRelations[]>([]);
  const [vendors, setVendors] = useState<Pick<Vendor, 'id' | 'name' | 'brandId'>[]>([]);
  const [brands, setBrands] = useState<Pick<Brand, 'id' | 'name'>[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formEntries, setFormEntries] = useState<RetentionEntryWithRelations[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'dateOfReturn', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const router = useRouter();
  const pathname = usePathname();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { rorEntries: retentionEntriesData, vendors, brands, userPermissions } = await getDepositorRetentionPageData();
      setRetentionEntries(retentionEntriesData as any);
      setVendors(vendors);
      setBrands(brands);
      setUserPermissions(new Set(userPermissions));
    } catch (error) {
      console.error("Failed to fetch page data", error);
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') router.push('/unauthorized');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const routePath = pathname.split('/').pop() || 'depositor-retention';
  const canCreate = userPermissions.has(`${routePath}:create`);
  const canUpdate = userPermissions.has(`${routePath}:update`);
  const canDelete = userPermissions.has(`${routePath}:delete`);

  const handleNewEntry = () => {
    setFormEntries([]);
    setSidebarOpen(true);
  };

  const handleEditEntry = (entry: RetentionEntryWithRelations) => {
    const entryDate = new Date(entry.dateOfReturn);
    const entriesForVendorAndDate = retentionEntries.filter(e => {
      const d = new Date(e.dateOfReturn);
      return e.vendorId === entry.vendorId && d.getFullYear() === entryDate.getFullYear() && d.getMonth() === entryDate.getMonth();
    });
    setFormEntries(entriesForVendorAndDate);
    setSidebarOpen(true);
  };

  const handleDeleteEntry = async (id: number) => {
    const result = await deleteDepositorRetention({ id, routePath });
    if ('error' in result && result.error) {
      toast.error('Deletion Failed', { description: result.error });
    } else {
      toast.success('Entry deleted successfully.');
      fetchData();
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const groupedAndSortedEntries = useMemo(() => {
    const grouped: Record<string, GroupedRetentionEntry> = retentionEntries.reduce((acc, entry) => {
      const date = new Date(entry.dateOfReturn);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-indexed
      const key = `${entry.vendorId}-${year}-${month}`;

      if (!acc[key]) {
        acc[key] = {
          groupKey: key,
          vendorId: entry.vendorId,
          vendorName: entry.vendor.name,
          brandName: entry.vendor.brand.name,
          month: month + 1,
          year: year,
          percentages: {},
          originalEntries: [],
        };
      }
      acc[key].percentages[entry.dayName] = (entry.percentage as any).toNumber();
      acc[key].originalEntries.push(entry);
      return acc;
    }, {} as Record<string, GroupedRetentionEntry>);

    let sortableEntries = Object.values(grouped);

    if (sortConfig !== null) {
      sortableEntries.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof GroupedRetentionEntry] ?? 0;
        const bValue = b[sortConfig.key as keyof GroupedRetentionEntry] ?? 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableEntries;
  }, [retentionEntries, sortConfig]);

  const filteredEntries = useMemo(() => groupedAndSortedEntries.filter(entry =>
    (searchQuery === '' || entry.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) || entry.brandName.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!brandId || entry.originalEntries[0].vendor.brand.id === parseInt(brandId, 10)) &&
    (!vendorId || entry.vendorId === parseInt(vendorId, 10))
  ), [groupedAndSortedEntries, searchQuery, brandId, vendorId]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, itemsPerPage, brandId, vendorId]);
  useEffect(() => { setVendorId(null); }, [brandId]);

  const paginatedEntries = useMemo(() => filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredEntries, currentPage, itemsPerPage]);
  const brandOptions = brands.map(b => ({ value: String(b.id), label: b.name }));
  const vendorOptions = useMemo(() => vendors.filter(a => !brandId || a.brandId === parseInt(brandId, 10)).map(a => ({ value: String(a.id), label: a.name })), [vendors, brandId]);

  const handleFormClose = () => {
    setSidebarOpen(false);
    fetchData();
  };

  const dayNames = ["NFD", "D1", "D3", "D7", "D15", "D30"];

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li><Link href="/" className="text-gray-500 hover:text-gray-700 flex items-center"><Home className="h-4 w-4 mr-2" /> Dashboard</Link></li>
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Depositor Retention</h1></div></li>
        </ol>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search by vendor or brand..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={20} /></button>}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-64"><AutocompleteDropdown
            options={brandOptions} value={brandId} onChange={setBrandId} placeholder="All Brands"
            searchPlaceholder="Search brands..."
            emptyText="No brands found."
          /></div>
          <div className="w-full sm:w-64"><AutocompleteDropdown
            options={vendorOptions} value={vendorId} onChange={setVendorId} placeholder="All Vendors"
            searchPlaceholder="Search vendors..."
            emptyText="No vendors found."
            disabled={vendorOptions.length === 0}
          /></div>
        </div>
      </div>

      {canCreate && (
        <div className="flex justify-end">
          <button onClick={handleNewEntry} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">+ New Retention Entry</button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-x-auto pb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[['Brand', 'brandName'], ['Vendor', 'vendorName'], ['Month/Year', 'year']].map(([label, key]) => (
                <th key={key} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort(key)}>
                  <div className="flex items-center">{label}{sortConfig?.key === key ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ChevronsUpDown size={14} />}</div>
                </th>
              ))}
              {dayNames.map(day => <th key={day} className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase">{day}</th>)}
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
            ) : paginatedEntries.map(entry => (
              <tr key={entry.groupKey}>
                <td className="px-6 py-2 whitespace-nowrap font-medium text-gray-800">{entry.brandName}</td>
                <td className="px-6 py-2 whitespace-nowrap">{entry.vendorName}</td>
                <td className="px-6 py-2 whitespace-nowrap text-gray-600">{new Date(entry.year, entry.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
                {dayNames.map(day => (
                  <td key={day} className="px-4 py-2 text-right whitespace-nowrap text-gray-600">
                    {entry.percentages[day] !== undefined ? `${entry.percentages[day]?.toFixed(2)}%` : '-'}
                  </td>
                ))}
                <td className="px-6 py-2 whitespace-nowrap text-sm">
                  {canUpdate && <button onClick={() => handleEditEntry(entry.originalEntries[0])} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100" title="Edit"><Pencil size={18} /></button>}
                  {canDelete && (
                    <ConfirmationPopover onConfirm={() => entry.originalEntries.forEach(oe => handleDeleteEntry(oe.id))} title="Delete All Entries?" description={`Delete all ${entry.originalEntries.length} entries for this vendor and month?`} confirmText="Delete All">
                      <button className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100" title="Delete"><Trash2 size={18} /></button>
                    </ConfirmationPopover>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination totalItems={filteredEntries.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} itemType="Entries" />

      <DepositorRetentionForm
        entries={formEntries}
        vendors={vendors}
        brands={brands}
        isOpen={sidebarOpen}
        onClose={handleFormClose}
        canCreate={canCreate}
        canUpdate={canUpdate}
        routePath={routePath}
      />
    </div>
  );
}