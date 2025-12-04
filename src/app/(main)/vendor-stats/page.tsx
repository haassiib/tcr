'use client';

import { useState, useMemo, useEffect, Fragment, useCallback } from 'react';
import { useVendorStatsStore } from '@/lib/store/useVendorStatsStore';
import Link from 'next/link';
import { Vendor, VendorStat, Brand } from '@prisma/client';
import VendorStatForm from './VendorStatForm';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import VendorStatView from './VendorStatView';
import { deleteVendorStat, updateVendorStat, updateMultipleVendorStats, getVendorStatsPageData } from './actions';
import { Pagination } from '@/components/ui/Pagination';
import { toast } from 'sonner';
import { Pencil, Search, Plus, Trash2, Eye, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronDown, Save, X, Home } from 'lucide-react';
import { startOfMonth } from 'date-fns';
import { useRouter } from 'next/navigation';
import ConfirmationPopover from '@/components/ui/ConfirmationPopover';
import DateRangePicker from '@/components/ui/DateRangePicker';

type VendorStatWithRelations = VendorStat & {
  vendor: Vendor & {
    brand: Brand;
  };
};

type GroupingOption = 'brand-date' | 'brand' | 'none';

interface GroupedStats {
  [key: string]: GroupedStats | VendorStatWithRelations[];
}

type EditableStatFields = Omit<VendorStat, 'id' | 'vendorId' | 'statDate' | 'createdAt' | 'updatedAt'>;
type EditedStats = Record<number, Partial<EditableStatFields>>;

export default function VendorStatsPage() {
  const [vendorStats, setVendorStats] = useState<VendorStatWithRelations[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<VendorStatWithRelations | null>(null);
  const [viewSidebarOpen, setViewSidebarOpen] = useState(false);
  const [selectedStatId, setSelectedStatId] = useState<number | null>(null);
  const [viewingStat, setViewingStat] = useState<VendorStatWithRelations | null>(null);
  // Group expansion states
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});
  const [editedStats, setEditedStats] = useState<EditedStats>({});
  const [activeEditingRowId, setActiveEditingRowId] = useState<number | null>(null);

  const {
    searchQuery, setSearchQuery,
    selectedBrandId, setSelectedBrandId,
    selectedVendorId, setSelectedVendorId,
    dateRange, setDateRange,
    groupingOption, setGroupingOption,
    sortConfig, setSortConfig,
    itemsPerPage, setItemsPerPage,
  } = useVendorStatsStore();

  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const canCreate = userPermissions.has('vendor-stats:create');
  const canUpdate = userPermissions.has('vendor-stats:update');
  const canDelete = userPermissions.has('vendor-stats:delete');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { vendorStats, vendors, userPermissions } = await getVendorStatsPageData();
      setVendorStats(vendorStats as any);
      setVendors(vendors as any);
      setUserPermissions(new Set(userPermissions));
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') router.push('/unauthorized');
      toast.error('Failed to fetch vendor stats page data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, router]);

  const handleEditStat = useCallback((stat: VendorStatWithRelations) => {
    setSelectedStatId(stat.id);
    setEditingStat(stat);
    setSidebarOpen(true);
  }, []);

  const handleAddStat = () => {
    setEditingStat(null);
    setSelectedStatId(null);
    setSidebarOpen(true);
  };

  const handleViewStat = useCallback((stat: VendorStatWithRelations) => {
    setSelectedStatId(stat.id);
    setViewingStat(stat);
    setViewSidebarOpen(true);
  }, []);

  const handleDeleteStat = useCallback(async (statId: number) => {
    const result = await deleteVendorStat(statId);
    if (result.error) {
      toast.error('Delete failed', { description: result.error });
    } else {
      toast.success('Stat deleted successfully!');
      setEditedStats(prev => {
        const newEdited = { ...prev };
        delete newEdited[statId];
        return newEdited;
      });
      fetchData();
    }
  }, [fetchData]);

  const handleInputChange = (statId: number, field: keyof EditableStatFields, value: string) => {
    setEditedStats(prev => ({
      ...prev,
      [statId]: {
        ...prev[statId],
        [field]: value,
      },
    }));
  };

  const handleSingleSave = async (statId: number) => {
    const changes = editedStats[statId];
    if (!changes) return;

    if (activeEditingRowId === statId) {
      setActiveEditingRowId(null);
    }

    const result = await updateVendorStat({ id: statId, ...changes });

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

    if (updates.length === 0) {
      toast.info('No changes to save.');
      setActiveEditingRowId(null);
      return;
    }

    const result = await updateMultipleVendorStats(updates);
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
    if (activeEditingRowId === statId) {
      setActiveEditingRowId(null);
    }
    setEditedStats(prev => {
      const newEditedStats = { ...prev };
      delete newEditedStats[statId];
      return newEditedStats;
    });
  };

  const handleRowClick = (stat: VendorStatWithRelations) => {
    setSelectedStatId(stat.id);
  };

  const handleRowDoubleClick = (stat: VendorStatWithRelations) => {
    setActiveEditingRowId(stat.id);
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStats = useMemo(() => {
    let sortableStats = [...vendorStats];
    if (sortConfig !== null) {
      sortableStats.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'brand') aValue = a.vendor.brand.name;
        else if (sortConfig.key === 'vendor') aValue = a.vendor.name;
        else aValue = a[sortConfig.key as keyof VendorStat];

        if (sortConfig.key === 'brand') bValue = b.vendor.brand.name;
        else if (sortConfig.key === 'vendor') bValue = b.vendor.name;
        else bValue = b[sortConfig.key as keyof VendorStat];

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

      const matchesBrand = selectedBrandId ? stat.vendor.brand.id === parseInt(selectedBrandId) : true;

      const matchesVendor = selectedVendorId ? stat.vendor.id === parseInt(selectedVendorId) : true;

      const statDate = new Date(stat.statDate);
      // Zustand stores dates as strings, so we need to convert them back to Date objects
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;

      const matchesDateRange = (!startDate || statDate >= startDate) &&
        (!endDate || statDate <= endDate);

      return matchesSearch && matchesBrand && matchesVendor && matchesDateRange;
    });
  }, [sortedStats, searchQuery, selectedBrandId, selectedVendorId, dateRange]);

  const paginatedData = useMemo(() => {
    if (groupingOption === 'none') {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredStats.slice(startIndex, startIndex + itemsPerPage);
    }

    const grouped = filteredStats.reduce((acc: GroupedStats, stat) => {
      const date = new Date(stat.statDate).toLocaleDateString('en-CA');
      const brandName = stat.vendor.brand.name;
      let currentLevel = acc;

      const groupings: string[] = groupingOption.split('-');

      for (let i = 0; i < groupings.length; i++) {
        const groupKey = groupings[i] === 'date' ? date : brandName;
        if (i < groupings.length - 1) {
          if (!currentLevel[groupKey]) currentLevel[groupKey] = {};
          currentLevel = currentLevel[groupKey] as GroupedStats;
        } else {
          if (!currentLevel[groupKey]) currentLevel[groupKey] = [];
          (currentLevel[groupKey] as VendorStatWithRelations[]).push(stat);
        }
      }
      return acc;
    }, {});

    const primaryKeys = Object.keys(grouped).sort((a, b) => {
      if (groupingOption.startsWith('date')) return b.localeCompare(a);
      return a.localeCompare(b);
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedKeys = primaryKeys.slice(startIndex, startIndex + itemsPerPage);

    const paginatedResult: GroupedStats = {};
    for (const key of paginatedKeys) {
      paginatedResult[key] = grouped[key];
    }
    return paginatedResult;
  }, [filteredStats, currentPage, itemsPerPage, groupingOption]);

  const totalPages = useMemo(() => {
    if (groupingOption === 'none') {
      return Math.ceil(filteredStats.length / itemsPerPage);
    }
    const grouped = filteredStats.reduce((acc: Record<string, boolean>, stat) => {
      const date = new Date(stat.statDate).toLocaleDateString('en-CA');
      const brandName = stat.vendor.brand.name;
      const key = groupingOption.startsWith('date') ? date : brandName;
      acc[key] = true;
      return acc;
    }, {});
    return Math.ceil(Object.keys(grouped).length / itemsPerPage);
  }, [filteredStats, itemsPerPage, groupingOption]);

  const totalItems = useMemo(() => {
    if (groupingOption === 'none') {
      return filteredStats.length;
    }
    const grouped = filteredStats.reduce((acc: Record<string, boolean>, stat) => {
      const date = new Date(stat.statDate).toLocaleDateString('en-CA');
      const brandName = stat.vendor.brand.name;
      const key = groupingOption.startsWith('date') ? date : brandName;
      acc[key] = true;
      return acc;
    }, {});
    return Object.keys(grouped).length;
  }, [filteredStats, groupingOption]);


  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBrandId, selectedVendorId, dateRange, itemsPerPage, groupingOption]);

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const toggleBrandExpansion = (brandKey: string) => {
    setExpandedBrands(prev => ({ ...prev, [brandKey]: !prev[brandKey] }));
  };


  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const uniqueBrands = useMemo(() => {
    const brandsMap = new Map<number, Brand>();
    vendors.forEach(vendor => brandsMap.set((vendor as any).brand.id, (vendor as any).brand));
    return Array.from(brandsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors]);

  const uniqueVendors = useMemo(() => {
    return [...new Map(vendors.map(vendor => [vendor.id, vendor])).values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors]);

  const expandAll = () => {
    const newExpandedDates: Record<string, boolean> = {};
    const newExpandedBrands: Record<string, boolean> = {};
    Object.keys(paginatedData as GroupedStats).forEach(key1 => {
      newExpandedDates[key1] = true;
      Object.keys((paginatedData as GroupedStats)[key1]).forEach(key2 => {
        newExpandedBrands[`${key1}-${key2}`] = true;
      });
    });
    setExpandedDates(newExpandedDates);
    setExpandedBrands(newExpandedBrands);
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ChevronsUpDown size={14} className="ml-1 text-gray-400" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
  };

  const collapseAll = () => {
    setExpandedDates({});
    setExpandedBrands({});
  };

  const renderStatRow = useCallback((stat: VendorStatWithRelations, indentClass = '') => {
    const hasChanges = !!editedStats[stat.id];
    const currentData = { ...stat, ...editedStats[stat.id] };
    const isEditing = activeEditingRowId === stat.id;

    const isGrouped = groupingOption !== 'none';
    const isBrandGrouped = groupingOption.includes('brand');
    const isDateGrouped = groupingOption.includes('date');

    const renderInput = (field: keyof EditableStatFields, type: 'number' | 'text' = 'number', step = '1') => (
      <input
        type={type}
        step={step}
        value={currentData[field as keyof typeof currentData]?.toString() ?? ''}
        onChange={(e) => handleInputChange(stat.id, field, e.target.value)}
        className="w-24 h-8 border border-gray-300 text-right rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        onClick={(e) => e.stopPropagation()}
      />
    );

    return (
      <tr key={stat.id} onClick={() => handleRowClick(stat)} onDoubleClick={() => handleRowDoubleClick(stat)} className={`transition-colors cursor-pointer ${hasChanges ? 'bg-yellow-50' : (selectedStatId === stat.id ? 'bg-blue-50' : 'hover:bg-gray-50')}`}>
        <td className={`px-6 py-2 whitespace-nowrap text-sm text-gray-500 ${indentClass}`}>{isBrandGrouped ? '' : stat.vendor.brand.name}</td>
        <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">{isDateGrouped ? '' : new Date(stat.statDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td className={`px-2 py-2 whitespace-nowrap text-sm text-gray-500 ${selectedStatId === stat.id ? 'font-semibold text-blue-800' : ''}`}>
          {isGrouped ? <span className={indentClass}>{stat.vendor.name}</span> : stat.vendor.name}
        </td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('deposit', 'number', '0.01') : `$${Number(currentData.deposit).toFixed(2)}`}</td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('withdraw', 'number', '0.01') : `$${Number(currentData.withdraw).toFixed(2)}`}</td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('registration') : currentData.registration}</td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('firstTimeDeposit', 'number', '1') : currentData.firstTimeDeposit}</td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('adExpense', 'number', '0.01') : `$${Number(currentData.adExpense).toFixed(2)}`}</td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('adsCommission', 'number', '0.01') : `${Number(currentData.adsCommission).toFixed(2)}%`}</td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('dailyBudget', 'number', '0.01') : `$${Number(currentData.dailyBudget).toFixed(2)}`}</td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('topUpAmount', 'number', '0.01') : `$${Number(currentData.topUpAmount).toFixed(2)}`}</td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('adsViews') : currentData.adsViews}</td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('adsClicks') : currentData.adsClicks}</td>
        <td className="px-2 py-2 text-right text-sm text-gray-500">{isEditing ? renderInput('adsChargeback', 'number', '0.01') : `$${Number(currentData.adsChargeback).toFixed(2)}`}</td>
        <td className="px-2 py-2 whitespace-nowrap text-sm">
          <div className="flex items-center space-x-1">
            {hasChanges ? (
              <>
                <button onClick={(e) => { e.stopPropagation(); handleSingleSave(stat.id); }} className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-100 transition-colors" title="Save row"><Save size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDiscardChanges(stat.id); }} className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors" title="Discard changes"><X size={18} /></button>
              </>
            ) : (
              <>
                <button onClick={(e) => { e.stopPropagation(); handleViewStat(stat); }} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors" title="View stats"><Eye size={18} /></button>
                {canUpdate && (
                  <button onClick={(e) => { e.stopPropagation(); handleEditStat(stat); }} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit stats in sidebar"><Pencil size={18} /></button>
                )}
                {canDelete && (
                  <ConfirmationPopover onConfirm={() => handleDeleteStat(stat.id)} title="Delete Stat?" description="This action cannot be undone." confirmText="Delete">
                    <button className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors" title="Delete stat"><Trash2 size={18} /></button>
                  </ConfirmationPopover>
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    );
  }, [selectedStatId, editedStats, activeEditingRowId, handleViewStat, handleEditStat, handleDeleteStat, groupingOption, canUpdate, canDelete]);

  const allExpanded = useMemo(() => {
    if (groupingOption === 'none' || Object.keys(paginatedData).length === 0) return false;
    return Object.keys(paginatedData as GroupedStats).every(key1 => {
      if (!expandedDates[key1]) return false;
      if (groupingOption.includes('-')) {
        return Object.keys((paginatedData as GroupedStats)[key1]).every(key2 => expandedBrands[`${key1}-${key2}`]);
      }
      return true;
    });
  }, [paginatedData, expandedDates, expandedBrands, groupingOption]);

  const handleGroupingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGroupingOption(e.target.value as GroupingOption);
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
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Vendor Stats</h1></div></li>
        </ol>
      </nav>

      {canCreate && (
        <div className="flex justify-end space-x-4">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by vendor or brand..."
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
          <div className="ml-auto flex items-center space-x-4">
            <Link
              href="/vendor-stats/entry"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus size={18} className="mr-2" />
              Add Multiple Stats
            </Link>
            <button
              onClick={handleAddStat}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus size={18} className="mr-2" /> Add New Stat
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-end md:items-center space-y-4 md:space-y-0">
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
          {/* Brand Filter */}
          <div>
            <AutocompleteDropdown
              className="w-full sm:w-64"
              options={uniqueBrands.map(brand => ({ value: brand.id.toString(), label: brand.name }))}
              value={selectedBrandId}
              onChange={setSelectedBrandId}
              placeholder="All Brands"
              searchPlaceholder="Search brand..."
              emptyText="No brand found."
            />
          </div>

          {/* Vendor Filter */}
          <div>
            <AutocompleteDropdown
              className="w-full sm:w-64"
              options={uniqueVendors.map(vendor => ({ value: vendor.id.toString(), label: vendor.name }))}
              value={selectedVendorId}
              onChange={setSelectedVendorId}
              placeholder="All Vendors"
              searchPlaceholder="Search vendor..."
              emptyText="No vendor found."
            />
          </div>

          {/* Grouping Selector */}
          <div>
            <select
              value={groupingOption}
              onChange={handleGroupingChange}
              className="w-full sm:w-64 h-[42px] pl-2 bg-white border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="none">No Grouping</option>
              <option value="brand">Group by Brand</option>
              {/* The user wants to keep brand-date */}
              <option value="brand-date">Group by Brand, then Date</option>
            </select>
          </div>
          {/* Date Range Filter */}
          <div className="w-full sm:w-80">
            <DateRangePicker
              className="w-full"
              onDateRangeChange={(range) => setDateRange({
                startDate: range.startDate,
                endDate: range.endDate,
              })}
              initialRange={dateRange}
            />
          </div>
        </div>
      </div>

      {Object.keys(editedStats).length > 0 && (
        <div className="flex justify-end items-center mb-4 pr-6 space-x-4 bg-yellow-100 border border-yellow-300 p-3 rounded-lg">
          <span className="text-sm font-medium text-yellow-800">You have {Object.keys(editedStats).length} unsaved changes.</span>
          <button
            onClick={handleMultiSave}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Save size={16} className="mr-2" /> Save All Changes
          </button>
        </div>
      )}
      {groupingOption !== 'none' && (
        <div className="flex justify-end mb-4 pr-6">
          <ToggleSwitch
            id="expand-all-stats"
            checked={allExpanded}
            onChange={allExpanded ? collapseAll : expandAll}
            label="Expand All"
          />
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('brand')}><div className="flex items-center">Brand{renderSortIcon('brand')}</div></th>
              <th className="px-2 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('statDate')}><div className="flex items-center">Date{renderSortIcon('statDate')}</div></th>
              <th className="px-2 py-4 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('vendor')}><div className="flex items-center">Vendor{renderSortIcon('vendor')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('deposit')}><div className="flex items-center justify-end">Deposit{renderSortIcon('deposit')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('withdraw')}><div className="flex items-center justify-end">Withdraw{renderSortIcon('withdraw')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('registration')}><div className="flex items-center justify-end">Reg{renderSortIcon('registration')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('firstTimeDeposit')}><div className="flex items-center justify-end">FTD{renderSortIcon('firstTimeDeposit')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('adExpense')}><div className="flex items-center justify-end">Ads Exp.{renderSortIcon('adExpense')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('adsCommission')}><div className="flex items-center justify-end">Ads Comm.{renderSortIcon('adsCommission')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('dailyBudget')}><div className="flex items-center justify-end">Budget{renderSortIcon('dailyBudget')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('topUpAmount')}><div className="flex items-center justify-end">Topup{renderSortIcon('topUpAmount')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('adsViews')}><div className="flex items-center justify-end">Views{renderSortIcon('adsViews')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('adsClicks')}><div className="flex items-center justify-end">Clicks{renderSortIcon('adsClicks')}</div></th>
              <th className="px-2 py-4 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('adsChargeback')}><div className="flex items-center justify-end">Chargeback{renderSortIcon('adsChargeback')}</div></th>
              <th className="px-2 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={15} className="text-center py-4">Loading...</td></tr>
            ) : groupingOption === 'none' ? (
              (paginatedData as VendorStatWithRelations[]).length > 0 ? (
                (paginatedData as VendorStatWithRelations[]).map(stat => renderStatRow(stat))
              ) : (
                <tr><td colSpan={15} className="text-center py-4">No data available for the selected filters.</td></tr>
              )
            ) : Object.keys(paginatedData).length > 0 ? (
              Object.entries(paginatedData as GroupedStats).map(([key1, level2]) => {
                const isDateGroup = groupingOption.startsWith('date');
                const isBrandGroup = groupingOption.startsWith('brand');
                const hasSubgroup = groupingOption.includes('-');

                return (
                  <Fragment key={key1}>
                    <tr className="bg-gray-200 hover:bg-gray-300 cursor-pointer" onClick={() => toggleDateExpansion(key1)}>
                      <td className="px-6 py-3 text-sm font-bold text-gray-900" colSpan={15}>
                        <div className="flex items-center">
                          {expandedDates[key1] ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                          {isDateGroup ? new Date(key1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : key1}
                        </div>
                      </td>
                    </tr>
                    {expandedDates[key1] && (
                      hasSubgroup ? (
                        Object.entries(level2 as GroupedStats).map(([key2, stats]) => {
                          const brandKey = `${key1}-${key2}`;
                          return (
                            <Fragment key={brandKey}>
                              <tr className="bg-gray-100 hover:bg-gray-200 cursor-pointer" onClick={() => toggleBrandExpansion(brandKey)}>
                                <td></td>
                                <td className="pl-2 pr-6 py-3 text-sm font-semibold text-gray-500" colSpan={14}>
                                  <div className="flex items-center">
                                    {expandedBrands[brandKey] ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                                    {isBrandGroup ? new Date(key2).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : key2}
                                  </div>
                                </td>
                              </tr>
                              {expandedBrands[brandKey] && (stats as VendorStatWithRelations[]).map(stat => renderStatRow(stat, 'pl-2'))}
                            </Fragment>
                          );
                        })
                      ) : ( // Single level grouping
                        (level2 as VendorStatWithRelations[]).map(stat => renderStatRow(stat, 'pl-8'))
                      )
                    )}
                  </Fragment>
                );
              })
            ) : (
              <tr><td colSpan={14} className="text-center py-4">No data available for the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={setItemsPerPage}
        itemType={groupingOption === 'none' ? 'Items' : groupingOption.startsWith('date') ? 'Dates' : 'Brands'}
      />

      {sidebarOpen && <VendorStatForm stat={editingStat} vendors={vendors} isOpen={sidebarOpen} onClose={() => { setSidebarOpen(false); fetchData(); }} canCreate={canCreate} canUpdate={canUpdate} />}
      <VendorStatView stat={viewingStat} isOpen={viewSidebarOpen} onClose={() => { setViewSidebarOpen(false); }} />
    </div>
  );
}