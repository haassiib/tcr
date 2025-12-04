import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { startOfMonth } from 'date-fns';

type GroupingOption = 'brand-date' | 'brand' | 'none';

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

type DateRange = { startDate: Date | null; endDate: Date | null };

interface VendorStatsState {
  searchQuery: string;
  selectedBrandId: string | null;
  selectedVendorId: string | null;
  dateRange: DateRange;
  groupingOption: GroupingOption;
  sortConfig: SortConfig;
  itemsPerPage: number;
  setSearchQuery: (query: string) => void;
  setSelectedBrandId: (id: string | null) => void;
  setSelectedVendorId: (id: string | null) => void;
  setDateRange: (range: DateRange) => void;
  setGroupingOption: (option: GroupingOption) => void;
  setSortConfig: (config: SortConfig) => void;
  setItemsPerPage: (count: number) => void;
}

export const useVendorStatsStore = create<VendorStatsState>()(
  persist(
    (set) => ({
      searchQuery: '',
      selectedBrandId: null,
      selectedVendorId: null,
      dateRange: {
        startDate: startOfMonth(new Date()),
        endDate: new Date(),
      },
      groupingOption: 'none',
      sortConfig: { key: 'statDate', direction: 'desc' },
      itemsPerPage: 15,
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedBrandId: (selectedBrandId) => set({ selectedBrandId }),
      setSelectedVendorId: (selectedVendorId) => set({ selectedVendorId }),
      setDateRange: (dateRange) => set({ dateRange }),
      setGroupingOption: (groupingOption) => set({ groupingOption }),
      setSortConfig: (sortConfig) => set({ sortConfig }),
      setItemsPerPage: (itemsPerPage) => set({ itemsPerPage }),
    }),
    { name: 'vendor-stats-filters' }
  )
);