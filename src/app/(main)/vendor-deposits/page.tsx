'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Vendor, VendorStat, Brand } from '@prisma/client';
import { getVendorDepositPageData, updateVendorDeposit, updateMultipleVendorDeposits } from './actions';
import { Pagination } from '@/components/ui/Pagination';
import { toast } from 'sonner';
import { Pencil, Search, Save, X, Home, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import VendorDepositForm from './VendorDepositForm';
import DateRangePicker from '@/components/ui/DateRangePicker';
import VendorDepositEntryForm from './VendorDepositEntryForm';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';

type VendorStatWithRelations = VendorStat & {
  vendor: Vendor & {
    brand: Brand;
  };
};

type EditableFundingFields = {
  deposit?: string;
  withdraw?: string;
};

type EditedStats = Record<number, Partial<EditableFundingFields>>;

export default function VendorDepositsPage() {
  const [vendorStats, setVendorStats] = useState<VendorStatWithRelations[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editedStats, setEditedStats] = useState<EditedStats>({});
  const [activeEditingRowId, setActiveEditingRowId] = useState<number | null>(null);
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [isSingleEntryFormOpen, setIsSingleEntryFormOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<VendorStatWithRelations | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'statDate', direction: 'desc' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const router = useRouter();

  const canUpdate = userPermissions.has('vendor-deposits:update');
  const canCreate = userPermissions.has('vendor-deposits:create');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { vendorStats, vendors, userPermissions, brands } = await getVendorDepositPageData();
      setVendorStats(vendorStats as any);
      setVendors(vendors as any);
      setAllBrands(brands as any);
      setUserPermissions(new Set(userPermissions));
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') router.push('/unauthorized');
      else toast.error("Failed to fetch funding data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData, isSingleEntryFormOpen, isEntryFormOpen]);

  const handleNewEntry = () => {
    setEditingStat(null);
    setIsSingleEntryFormOpen(true);
  };

  const handleInputChange = (statId: number, field: keyof EditableFundingFields, value: string) => {
    setEditedStats(prev => ({
      ...prev,
      [statId]: { ...prev[statId], [field]: value },
    }));
  };

  const handleSingleSave = async (statId: number) => {
    const changes = editedStats[statId];
    if (!changes) return;

    setActiveEditingRowId(null);
    const result = await updateVendorDeposit({ id: statId, ...changes });

    if (result.error) {
      toast.error('Save failed', { description: result.error });
    } else {
      toast.success('Row saved successfully!');
      setEditedStats(prev => {
        const newEditedStats = { ...prev };
        delete newEditedStats[statId];
        return newEditedStats;
      });
      fetchData();
    }
  };

  const handleMultiSave = async () => {
    const updates = Object.entries(editedStats).map(([id, changes]) => ({
      id: Number(id),
      ...changes,
    }));

    if (updates.length === 0) return toast.info('No changes to save.');

    const result = await updateMultipleVendorDeposits(updates);
    if (result.error) {
      toast.error('Save failed', { description: result.error });
    } else {
      toast.success(`All ${updates.length} changes saved successfully!`);
      setEditedStats({});
      setActiveEditingRowId(null);
      fetchData();
    }
  };

  const handleDiscardChanges = (statId: number) => {
    if (activeEditingRowId === statId) setActiveEditingRowId(null);
    setEditedStats(prev => {
      const newEditedStats = { ...prev };
      delete newEditedStats[statId];
      return newEditedStats;
    });
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStats = useMemo(() => {
    let sortableStats = [...vendorStats];
    if (sortConfig !== null) {
      sortableStats.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof VendorStat];
        let bValue: any = b[sortConfig.key as keyof VendorStat];
        if (sortConfig.key === 'brand') aValue = a.vendor.brand.name;
        if (sortConfig.key === 'vendor') aValue = a.vendor.name;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableStats;
  }, [vendorStats, sortConfig]);

  const filteredStats = useMemo(() => {
    return sortedStats.filter(stat => {
      const matchesSearch = stat.vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stat.vendor.brand.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBrand = selectedBrandId ? stat.vendor.brandId === parseInt(selectedBrandId) : true;
      const matchesVendor = selectedVendorId ? stat.vendor.id === parseInt(selectedVendorId) : true;
      const statDate = new Date(stat.statDate);
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
      const matchesDateRange = (!startDate || statDate >= startDate) && (!endDate || statDate <= endDate);
      return matchesSearch && matchesBrand && matchesVendor && matchesDateRange;
    });
  }, [sortedStats, searchQuery, selectedBrandId, selectedVendorId, dateRange]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStats.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStats, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedBrandId, selectedVendorId, dateRange, itemsPerPage]);

  const uniqueBrands = useMemo(() => Array.from(new Map(vendors.map(v => [(v as any).brand.id, (v as any).brand])).values()).sort((a, b) => a.name.localeCompare(b.name)), [vendors]);
  const uniqueVendors = useMemo(() => Array.from(new Map(vendors.map(v => [v.id, v])).values()).sort((a, b) => a.name.localeCompare(b.name)), [vendors]);

  const renderInput = (statId: number, field: keyof EditableFundingFields, value: any) => (
    <input
      type="number"
      step="0.01"
      value={value?.toString() ?? ''}
      onChange={(e) => handleInputChange(statId, field, e.target.value)}
      className="w-24 h-8 border border-gray-300 text-right rounded-md focus:ring-indigo-500 focus:border-indigo-500"
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li><Link href="/" className="text-gray-500 hover:text-gray-700 flex items-center"><Home className="h-4 w-4 mr-2" /> Dashboard</Link></li>
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Vendor Deposits</h1></div></li>
        </ol>
      </nav>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search by vendor or brand..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={20} /></button>}
        </div>
        <div className="flex flex-col md:items-end gap-4 w-full md:w-auto">
          <div className="flex flex-col md:flex-row md:justify-end gap-4 w-full">
            <AutocompleteDropdown className="w-full sm:w-48" options={uniqueBrands.map(b => ({ value: b.id.toString(), label: b.name }))} value={selectedBrandId} onChange={setSelectedBrandId} placeholder="All Brands" />
            <AutocompleteDropdown className="w-full sm:w-48" options={uniqueVendors.map(v => ({ value: v.id.toString(), label: v.name }))} value={selectedVendorId} onChange={setSelectedVendorId} placeholder="All Vendors" />
            <div className="w-full sm:w-72"><DateRangePicker onDateRangeChange={setDateRange} initialRange={dateRange} /></div>
          </div>
        </div>
      </div>

      {canCreate && (
        <div className="flex justify-end">
          <div className="flex space-x-4">
            <button onClick={handleNewEntry} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Plus size={18} className="mr-2 inline" />
              New Entry
            </button>
            <button onClick={() => setIsEntryFormOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              <Plus size={18} className="mr-2 inline" />
              Bulk Entry
            </button>
          </div>
        </div>
      )}

      {Object.keys(editedStats).length > 0 && (
        <div className="flex justify-end items-center mb-4 pr-6 space-x-4 bg-yellow-100 border border-yellow-300 p-3 rounded-lg">
          <span className="text-sm font-medium text-yellow-800">You have {Object.keys(editedStats).length} unsaved changes.</span>
          <button onClick={handleMultiSave} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"><Save size={16} className="mr-2" /> Save All Changes</button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Deposit</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Withdraw</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map(stat => {
                const hasChanges = !!editedStats[stat.id];
                const currentData = { ...stat, ...editedStats[stat.id] };
                const isEditing = activeEditingRowId === stat.id;
                return (
                  <tr key={stat.id} onDoubleClick={() => canUpdate && setActiveEditingRowId(stat.id)} className={`transition-colors cursor-pointer ${hasChanges ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{stat.vendor.brand.name}</td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{stat.vendor.name}</td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{new Date(stat.statDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="px-6 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput(stat.id, 'deposit', currentData.deposit) : `$${Number(currentData.deposit).toFixed(2)}`}</td>
                    <td className="px-6 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput(stat.id, 'withdraw', currentData.withdraw) : `$${Number(currentData.withdraw).toFixed(2)}`}</td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-1">
                        {hasChanges ? (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleSingleSave(stat.id); }} className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-100" title="Save row"><Save size={18} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDiscardChanges(stat.id); }} className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100" title="Discard changes"><X size={18} /></button>
                          </>
                        ) : (
                          canUpdate && <button onClick={(e) => { e.stopPropagation(); setActiveEditingRowId(stat.id); }} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100" title="Edit Funding"><Pencil size={18} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={6} className="text-center py-4">No data available for the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        totalItems={filteredStats.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        itemType="Entries"
      />

      <VendorDepositForm
        isOpen={isSingleEntryFormOpen}
        onClose={() => setIsSingleEntryFormOpen(false)}
        stat={editingStat}
        vendors={vendors as any}
        brands={uniqueBrands}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />

      <VendorDepositEntryForm
        isOpen={isEntryFormOpen}
        onClose={() => setIsEntryFormOpen(false)}
        vendors={vendors as any}
        brands={allBrands}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />
    </div>
  );
}