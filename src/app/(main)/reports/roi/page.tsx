'use client';

import { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import { useRoiStore } from '@/lib/store/useRoiStore';
import { ChevronDown, ChevronRight, Home, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown'; // prettier-ignore
import { getBrandOptions, getVendorSummaryReport, getVendorOptions } from './actions';
import Link from 'next/link';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { Pagination } from '@/components/ui/Pagination';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

interface ReportData {
  brand: string;
  vendor: string;
  statDate: string;
  deposit: number;
  registration: number;
  revenue: number;
  withdraw: number;
  totalAdCost: number;
  firstTimeDeposit: number;
  ltv: number;
  roi: number;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface VendorData {
  vendor: string;
  deposit: number;
  registration: number;
  revenue: number;
  withdraw: number;
  totalAdCost: number;
  firstTimeDeposit: number;
  ltv: number;
  roi: number;
}

interface DateStat {
  date: string;
  deposit: number;
  registration: number;
  revenue: number;
  withdraw: number;
  totalAdCost: number;
  firstTimeDeposit: number;
  ltv: number;
  roi: number;
}

interface AutocompleteOption {
  value: string;
  label: string;
}

export default function RoiReportPage() {
  const [groupedData, setGroupedData] = useState<GroupedData>({});
  interface VendorGrouping {
    dates: DateStat[];
    totals: Omit<DateStat, 'date'>;
  }
  // interface VendorStat {
  //   vendor: string;
  //   [key: string]: any;
  // }
  interface GroupedData {
    [brandName: string]: {
      vendors: { [vendorName: string]: VendorGrouping };
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
    dateRange, setDateRange,
    sortConfig, setSortConfig,
  } = useRoiStore();

  const routePath = pathname.split('/').pop() || 'roi';

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
        const { brand, vendor, statDate, ...metrics } = row;

        if (!acc[brand]) {
          acc[brand] = {
            vendors: {},
            brandTotals: { deposit: 0, registration: 0, withdraw: 0, revenue: 0, totalAdCost: 0, firstTimeDeposit: 0, ltv: 0, roi: 0 }
          };
        }

        if (!acc[brand].vendors[vendor]) {
          acc[brand].vendors[vendor] = {
            dates: [],
            totals: { deposit: 0, registration: 0, withdraw: 0, revenue: 0, totalAdCost: 0, firstTimeDeposit: 0, ltv: 0, roi: 0 }
          };
        }

        const dateStat = { date: new Date(statDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), ...metrics };
        acc[brand].vendors[vendor].dates.push(dateStat);

        // Aggregate for vendor totals
        Object.keys(metrics).forEach(key => {
          const metricKey = key as keyof typeof metrics;
          (acc[brand].vendors[vendor].totals[metricKey] as number) += metrics[metricKey];
        });

        // Aggregate for brand totals
        Object.keys(metrics).forEach(key => {
          const metricKey = key as keyof typeof metrics;
          (acc[brand].brandTotals[metricKey] as number) += metrics[metricKey];
        });

        // Recalculate ROI and LTV for totals
        acc[brand].vendors[vendor].totals.roi = acc[brand].vendors[vendor].totals.totalAdCost > 0 ? (acc[brand].vendors[vendor].totals.revenue / acc[brand].vendors[vendor].totals.totalAdCost) * 100 : 0;
        acc[brand].vendors[vendor].totals.ltv = acc[brand].vendors[vendor].totals.firstTimeDeposit > 0 ? (acc[brand].vendors[vendor].totals.revenue / acc[brand].vendors[vendor].totals.firstTimeDeposit) : 0;
        acc[brand].brandTotals.roi = acc[brand].brandTotals.totalAdCost > 0 ? (acc[brand].brandTotals.revenue / acc[brand].brandTotals.totalAdCost) * 100 : 0;
        acc[brand].brandTotals.ltv = acc[brand].brandTotals.firstTimeDeposit > 0 ? (acc[brand].brandTotals.revenue / acc[brand].brandTotals.firstTimeDeposit) : 0;
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
  }, [dateRange, brandId, vendorId, setGroupedData, router, routePath]);

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
      Object.keys(groupedData[brandName].vendors).forEach(vendorName => {
        allExpanded[`${brandName}-${vendorName}`] = true;
      });
    });
    setExpandedItems(allExpanded);
  };

  const collapseAll = () => {
    setExpandedItems({});
  };

  const allExpanded = useMemo(() => {
    const keys = Object.keys(groupedData).flatMap(brand => [brand, ...Object.keys(groupedData[brand].vendors).map(vendor => `${brand}-${vendor}`)]);
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
      sortableBrands.sort(([, dataA], [, dataB]) => {
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

  const calculateCVR = (ftd: number, totalAdCost: number) => {
    if (totalAdCost === 0) return '0.00%';
    return `${((ftd / totalAdCost) * 100).toFixed(2)}%`;
  };



  return (
    <div className="p-4 md:p-8">
      <nav className="text-sm mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="text-gray-500 hover:text-gray-700 flex items-center">
              <Home className="h-4 w-4 mr-2" /> Dashboard
            </Link>
          </li>
          <li><div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">ROI</h1></div></li>
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

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-2 py-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th scope="col" className="px-2 py-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th scope="col" className="px-2 py-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('deposit')}><div className="flex items-center justify-end">Deposit{renderSortIcon('deposit')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('withdraw')}><div className="flex items-center justify-end">Withdraw{renderSortIcon('withdraw')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('revenue')}><div className="flex items-center justify-end">Revenue{renderSortIcon('revenue')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('totalAdCost')}><div className="flex items-center justify-end">EXP+COMM{renderSortIcon('totalAdCost')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('firstTimeDeposit')}><div className="flex items-center justify-end">FTD{renderSortIcon('firstTimeDeposit')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('registration')}><div className="flex items-center justify-end">Reg{renderSortIcon('registration')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('ltv')}><div className="flex items-center justify-end">LTV{renderSortIcon('ltv')}</div></th>
              <th scope="col" className="px-2 py-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('roi')}><div className="flex items-center justify-end">ROI{renderSortIcon('roi')}</div></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={10} className="text-center py-4">Loading...</td></tr>
            ) : Object.keys(groupedData).length > 0 ? (
              paginatedBrands.map(([brandName, { vendors, brandTotals }]) => (
                <Fragment key={brandName}>
                  <tr className="bg-gray-100 hover:bg-gray-200 cursor-pointer" onClick={() => toggleExpansion(brandName)}>
                    <td className="px-4 py-3 text-sm font-bold text-gray-700" colSpan={3}>
                      <div className="flex items-center">
                        {expandedItems[brandName] ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                        {brandName}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.deposit.toFixed(2)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.withdraw.toFixed(2)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.revenue.toFixed(2)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.totalAdCost.toFixed(2)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.firstTimeDeposit.toFixed(0)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.registration.toFixed(0)}</td>
                    <td className="px-2 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.ltv.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-700 text-right">{brandTotals.totalAdCost > 0 ? ((brandTotals.revenue / brandTotals.totalAdCost) * 100).toFixed(2) : '0.00'}%</td>
                  </tr>
                  {expandedItems[brandName] && Object.entries(vendors).map(([vendorName, { dates, totals }]) => (
                    <Fragment key={vendorName}>
                      <tr className="bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => toggleExpansion(`${brandName}-${vendorName}`)}>
                        <td className="px-4 py-3"></td>
                        <td className="pl-6 py-3 text-sm font-semibold text-gray-600" colSpan={2}>
                          <div className="flex items-center">
                            {expandedItems[`${brandName}-${vendorName}`] ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                            {vendorName}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{totals.deposit.toFixed(2)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{totals.withdraw.toFixed(2)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{totals.revenue.toFixed(2)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{totals.totalAdCost.toFixed(2)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{totals.firstTimeDeposit.toFixed(0)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{totals.registration.toFixed(0)}</td>
                        <td className="px-2 py-3 text-sm font-semibold text-gray-600 text-right">{totals.ltv.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">{totals.totalAdCost > 0 ? ((totals.revenue / totals.totalAdCost) * 100).toFixed(2) : '0.00'}%</td>
                      </tr>
                      {expandedItems[`${brandName}-${vendorName}`] && dates.map((dateData, dateIndex) => (
                        <tr key={dateIndex} className="hover:bg-gray-50">
                          <td className="px-4 py-3" colSpan={2}></td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">{dateData.date}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{dateData.deposit.toFixed(2)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{dateData.withdraw.toFixed(2)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{dateData.revenue.toFixed(2)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{dateData.totalAdCost.toFixed(2)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{dateData.firstTimeDeposit.toFixed(0)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{dateData.registration.toFixed(0)}</td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{dateData.ltv.toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{dateData.roi.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </Fragment>
              ))
            ) : (
              <tr><td colSpan={10} className="text-center py-4">No data available for the selected filters.</td></tr>
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