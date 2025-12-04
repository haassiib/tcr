'use client';

import { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import { useBrandStatsStore } from '@/lib/store/useBrandStatsStore';
import { ChevronDown, ChevronRight, Home, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown'; // prettier-ignore
import { getBrandOptions, getVendorSummaryReport, getVendorOptions } from './actions';
import DateRangePicker from '@/components/ui/DateRangePicker';
import Link from 'next/link';
import { Pagination } from '@/components/ui/Pagination';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';import { usePathname } from 'next/navigation';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

interface ReportData {
  brand: string;
  vendor: string;
  statDate: string;
  deposit: number;
  revenue: number;
  withdraw: number;
  registration: number;
  adExpense: number;
  firstTimeDeposit: number;
  totalAdCost: number;
  dailyBudget: number;
  topUpAmount: number;
  balance: number;
  ltv: number;
  roi: number;
  adsViews: number;
  adsClicks: number;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface VendorData {
  vendor: string;
  deposit: number;
  revenue: number;
  withdraw: number;
  registration: number;
  adExpense: number;
  firstTimeDeposit: number;
  totalAdCost: number;
  dailyBudget: number;
  topUpAmount: number;
  balance: number;
  ltv: number;
  roi: number;
  adsViews: number;
  adsClicks: number;
}

interface DateStat {
  date: string;
  deposit: number;
  revenue: number;
  withdraw: number;
  registration: number;
  adExpense: number;
  firstTimeDeposit: number;
  totalAdCost: number;
  dailyBudget: number;
  topUpAmount: number;
  balance: number;
  ltv: number;
  roi: number;
  adsViews: number;
  adsClicks: number;
}

interface AutocompleteOption {
  value: string;
  label: string;
}

export default function VendorSummaryReportPage() {
  const [groupedData, setGroupedData] = useState<GroupedData>({});
  interface VendorStat {
    vendor: string;
    [key: string]: any;
  }
  interface GroupedData {
    [brandName: string]: {
      dates: { [date: string]: { vendors: VendorStat[]; dateTotals: Omit<DateStat, 'date'> } };
      brandTotals: Omit<DateStat, 'date'>;
    };
  }
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [brandOptions, setBrandOptions] = useState<AutocompleteOption[]>([]);
  const [vendorOptions, setVendorOptions] = useState<AutocompleteOption[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const router = useRouter();
  const pathname = usePathname();

  const {
    selectedBrandId: brandId, setSelectedBrandId: setBrandId,
    selectedVendorId: vendorId, setSelectedVendorId: setVendorId,
    dateRange, setDateRange, sortConfig, setSortConfig,
  } = useBrandStatsStore();

  const routePath = pathname.split('/').pop() || 'brand-stats';

  const fetchData = useCallback(async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return;
    }

    setLoading(true);
    try {
      const result: ReportData[] = await getVendorSummaryReport({
        startDate: new Date(dateRange.startDate),
        endDate: new Date(dateRange.endDate),
        brandId,
        vendorId,
        routePath,
      });

      const grouped = result.reduce((acc: GroupedData, row) => {
        const { brand, vendor, statDate, ...metrics } = row; // row is a ReportData
        const date = new Date(statDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (!acc[brand]) {
          acc[brand] = {
            dates: {},
            brandTotals: { deposit: 0, adExpense: 0, withdraw: 0, revenue: 0, registration: 0, firstTimeDeposit: 0, totalAdCost: 0, dailyBudget: 0, topUpAmount: 0, balance: 0, roi: 0, ltv: 0, adsViews: 0, adsClicks: 0 },
          };
        }

        if (!acc[brand].dates[date]) {
          acc[brand].dates[date] = {
            vendors: [],
            dateTotals: { deposit: 0, adExpense: 0, withdraw: 0, revenue: 0, registration: 0, firstTimeDeposit: 0, totalAdCost: 0, dailyBudget: 0, topUpAmount: 0, balance: 0, roi: 0, ltv: 0, adsViews: 0, adsClicks: 0 },
          };
        }

        // Add vendor data for the date
        acc[brand].dates[date].vendors.push({ vendor, ...metrics });

        // Aggregate for date totals
        Object.keys(metrics).forEach(key => {
          const metricKey = key as keyof typeof metrics;
          (acc[brand].dates[date].dateTotals[metricKey] as number) += metrics[metricKey];
        });

        // Aggregate for brand totals
        Object.keys(metrics).forEach(key => {
          const metricKey = key as keyof typeof metrics;
          // @ts-ignore
          (acc[brand].brandTotals[metricKey] as number) += metrics[metricKey];
        });

        return acc;
      }, {});
      setGroupedData(grouped);
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        router.push('/unauthorized');
      } else {
        toast.error('Failed to fetch report data.');
        console.error('Error fetching data:', error);
      }
      setGroupedData({});
    } finally {
      setLoading(false);
    }
  }, [dateRange, brandId, vendorId, router, routePath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    async function fetchBrands() {
      try {
        const brands = await getBrandOptions({ routePath });
        setBrandOptions(brands);
      } catch (error) {
        console.error('Failed to fetch brands', error);
      }
    }

    fetchBrands();
  }, [routePath]);

  // Effect to fetch vendors when brand changes
  useEffect(() => {
    async function fetchVendors() {
      try {
        const vendors = await getVendorOptions({ brandId, routePath });
        setVendorOptions(vendors);
      } catch (error) {
        console.error('Failed to fetch vendors', error);
      }
    }

    fetchVendors();
    // When brand changes, reset the selected vendor
  }, [brandId, setVendorId, routePath]);

  useEffect(() => {
    setCurrentPage(1);
  }, [brandId, vendorId, dateRange, itemsPerPage]);

  // Effect to expand brands by default when data loads
  useEffect(() => {
    if (Object.keys(groupedData).length > 0) {
      const initialExpansionState: Record<string, boolean> = {};
      Object.keys(groupedData).forEach(brandName => {
        initialExpansionState[brandName] = true; // Set each brand to be expanded
      });
      setExpandedItems(initialExpansionState);
    } else {
      setExpandedItems({}); // Reset when there's no data
    }
  }, [groupedData]);

  const toggleExpansion = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    Object.keys(groupedData).forEach(brandName => {
      allExpanded[brandName] = true;
      Object.keys(groupedData[brandName].dates).forEach(date => {
        allExpanded[`${brandName}-${date}`] = true;
      });
    });
    setExpandedItems(allExpanded);
  };

  const collapseAll = () => {
    setExpandedItems({});
  };

  const allExpanded = useMemo(() => {
    const keys = Object.keys(groupedData).flatMap(brand => [brand, ...Object.keys(groupedData[brand].dates).map(date => `${brand}-${date}`)]);
    return keys.length > 0 && keys.every(key => expandedItems[key]);
  }, [groupedData, expandedItems]);

  const handleExpandAllToggle = () => {
    if (allExpanded) {
      collapseAll();
    } else {
      expandAll();
    }
  };

  const totalItems = Object.keys(groupedData).length;

  const sortedBrands = useMemo(() => {
    let sortableBrands = Object.entries(groupedData);
    if (sortConfig !== null) {
      sortableBrands.sort(([brandA, dataA], [brandB, dataB]) => {
        const aValue = dataA.brandTotals[sortConfig.key as keyof typeof dataA.brandTotals];
        const bValue = dataB.brandTotals[sortConfig.key as keyof typeof dataB.brandTotals];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableBrands;
  }, [groupedData, sortConfig]);

  const paginatedBrands = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedBrands.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedBrands, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= Math.ceil(totalItems / itemsPerPage)) {
      setCurrentPage(page);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ChevronsUpDown size={14} className="ml-1 text-gray-400" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
  };

  const calculateCost = (expense: number, count: number) => {
    if (count === 0) return '0.00';
    return (expense / count).toFixed(2);
  };

  const calculatePercentage = (numerator: number, denominator: number) => {
    if (denominator === 0) return '0.00%';
    return `${((numerator / denominator) * 100).toFixed(2)}%`;
  };



  return (
    <div>
      <nav className="text-sm mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="text-gray-500 hover:text-gray-700 flex items-center">
              <Home className="h-4 w-4 mr-2" /> Dashboard
            </Link>
          </li>
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Brand Stats</h1></div></li>
        </ol>
      </nav>
      <div className="flex flex-col md:flex-row md:justify-end md:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
          <div className="w-full sm:w-72">
            <DateRangePicker onDateRangeChange={(range) => setDateRange({
                startDate: range.startDate,
                endDate: range.endDate,
              })} initialRange={dateRange} />
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4 pr-6">
        <ToggleSwitch
          id="expand-all-roi"
          checked={allExpanded}
          onChange={handleExpandAllToggle}
          label="Expand All"
        />
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto overflow-y-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th scope="col" className="px-2 py-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-2 py-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('topUpAmount')}><div className="flex items-center justify-end">TopUp{renderSortIcon('topUpAmount')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('balance')}><div className="flex items-center justify-end">Balance{renderSortIcon('balance')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('adExpense')}><div className="flex items-center justify-end">Ads Exp.{renderSortIcon('adExpense')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('totalAdCost')}><div className="flex items-center justify-end">EXP+COMM{renderSortIcon('totalAdCost')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('adsViews')}><div className="flex items-center justify-end">Views{renderSortIcon('adsViews')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('adsClicks')}><div className="flex items-center justify-end">Clicks{renderSortIcon('adsClicks')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('registration')}><div className="flex items-center justify-end">Reg{renderSortIcon('registration')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reg Cost</th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reg(%)</th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('firstTimeDeposit')}><div className="flex items-center justify-end">FTD{renderSortIcon('firstTimeDeposit')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">FTD Cost</th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">FTD(%)</th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('ltv')}><div className="flex items-center justify-end">LTV{renderSortIcon('ltv')}</div></th>
              <th scope="col" className="px-4 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('roi')}><div className="flex items-center justify-end">ROI{renderSortIcon('roi')}</div></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={18} className="text-center py-4">Loading...</td></tr>
            ) : Object.keys(groupedData).length > 0 ? (
              paginatedBrands.map(([brandName, { dates, brandTotals }]) => (
                <Fragment key={brandName}>
                  <tr className="bg-gray-100 hover:bg-gray-200 cursor-pointer" onClick={() => toggleExpansion(brandName)}>
                    <td className="px-4 py-3 text-sm font-bold text-gray-700" colSpan={3}>
                      <div className="flex items-center">
                        {expandedItems[brandName] ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                        {brandName}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.topUpAmount.toFixed(2)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.balance.toFixed(2)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.adExpense.toFixed(2)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.totalAdCost.toFixed(2)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.adsViews}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.adsClicks}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.registration}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{calculateCost(brandTotals.totalAdCost, brandTotals.registration)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{calculatePercentage(brandTotals.registration, brandTotals.adsClicks)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.firstTimeDeposit}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{calculateCost(brandTotals.totalAdCost, brandTotals.firstTimeDeposit)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{calculatePercentage(brandTotals.firstTimeDeposit, brandTotals.adsClicks)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.firstTimeDeposit > 0 ? (brandTotals.revenue / brandTotals.firstTimeDeposit).toFixed(2) : '0.00'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.totalAdCost > 0 ? ((brandTotals.revenue / brandTotals.totalAdCost) * 100).toFixed(2) : '0.00'}%</td>
                  </tr>
                  {expandedItems[brandName] && Object.entries(dates).map(([date, { vendors, dateTotals }]) => (
                    <Fragment key={date}>
                      <tr className="bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => toggleExpansion(`${brandName}-${date}`)}>
                        <td className="px-4 py-3"></td>
                        <td className="pl-2 py-3 text-sm font-semibold text-gray-600" colSpan={1}>
                          <div className="flex items-center">
                            {expandedItems[`${brandName}-${date}`] ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                            {date}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right"></td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{dateTotals.topUpAmount.toFixed(2)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{dateTotals.balance.toFixed(2)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{dateTotals.adExpense.toFixed(2)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{dateTotals.totalAdCost.toFixed(2)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{dateTotals.adsViews}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{dateTotals.adsClicks}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{dateTotals.registration.toFixed(0)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{calculateCost(dateTotals.totalAdCost, dateTotals.registration)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{calculatePercentage(dateTotals.registration, dateTotals.adsClicks)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{dateTotals.firstTimeDeposit.toFixed(0)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{calculateCost(dateTotals.totalAdCost, dateTotals.firstTimeDeposit)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{calculatePercentage(dateTotals.firstTimeDeposit, dateTotals.adsClicks)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{dateTotals.firstTimeDeposit > 0 ? (dateTotals.revenue / dateTotals.firstTimeDeposit).toFixed(2) : '0.00'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">{dateTotals.totalAdCost > 0 ? ((dateTotals.revenue / dateTotals.totalAdCost) * 100).toFixed(2) : '0.00'}%</td>
                      </tr>
                      {expandedItems[`${brandName}-${date}`] && vendors.map((vendorData, vendorIndex) => (
                        <tr key={vendorIndex} className="hover:bg-gray-50">
                          <td className="px-4 py-3" colSpan={1}></td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500"></td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">{vendorData.vendor}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{vendorData.topUpAmount.toFixed(2)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{vendorData.balance.toFixed(2)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{vendorData.adExpense.toFixed(2)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{vendorData.totalAdCost.toFixed(2)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{vendorData.adsViews}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{vendorData.adsClicks}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{vendorData.registration}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{calculateCost(vendorData.totalAdCost, vendorData.registration)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{calculatePercentage(vendorData.registration, vendorData.adsClicks)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{vendorData.firstTimeDeposit}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{calculateCost(vendorData.totalAdCost, vendorData.firstTimeDeposit)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{calculatePercentage(vendorData.firstTimeDeposit, vendorData.adsClicks)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{vendorData.ltv.toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{vendorData.roi.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </Fragment>
              ))
            ) : (
              <tr><td colSpan={18} className="text-center py-4">No data available for the selected filters.</td></tr>
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
        itemType="Brands"
      />
    </div>
  );
}