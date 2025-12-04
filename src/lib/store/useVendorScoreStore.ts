import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { startOfMonth } from 'date-fns';

type DateRange = { startDate: Date | null; endDate: Date | null };

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

interface VendorScoreState {
  selectedBrandId: string | null;
  selectedVendorId: string | null;
  dateRange: DateRange;
  sortConfig: SortConfig;
  setSelectedBrandId: (id: string | null) => void;
  setSelectedVendorId: (id: string | null) => void;
  setDateRange: (range: DateRange) => void;
  setSortConfig: (config: SortConfig) => void;
}

export const useVendorScoreStore = create<VendorScoreState>()(
  persist(
    (set) => ({
      selectedBrandId: null,
      selectedVendorId: null,
      dateRange: {
        startDate: startOfMonth(new Date()),
        endDate: new Date(),
      },
      sortConfig: { key: 'score', direction: 'desc' },
      setSelectedBrandId: (selectedBrandId) => set({ selectedBrandId }),
      setSelectedVendorId: (selectedVendorId) => set({ selectedVendorId }),
      setDateRange: (dateRange) => set({ dateRange }),
      setSortConfig: (sortConfig) => set({ sortConfig }),
    }),
    { name: 'vendor-score-filters' }
  )
);