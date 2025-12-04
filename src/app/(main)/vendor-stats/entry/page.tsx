'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Vendor, Brand } from '@prisma/client';
import { createVendorStats, getVendorStatEntryPageData } from '../actions';
import { Plus, Trash2, Download, Upload, Home } from 'lucide-react';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface NewVendorStatRow {
  tempId: number; // Used for keying in React, not sent to backend
  brandId: string;
  vendorId: string;
  statDate: string; // ISO string format
  registration: string;
  firstTimeDeposit: string;
  adsCommission: string;
  dailyBudget: string;
  topUpAmount: string;
  adExpense: string;
  deposit: string;
  withdraw: string;
  adsViews: string;
  adsClicks: string;
  adsChargeback: string;
}

// Preprocess empty strings to undefined so that zod can apply defaults.
const numberPreprocess = (val: unknown) => (val === '' || val === null ? undefined : Number(val));

const vendorStatSchema = z.object({
  vendorId: z.string().min(1, { message: 'Vendor is required' }),
  statDate: z.coerce.date({ errorMap: () => ({ message: 'Please select a valid date' }) }),
  registration: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Registrations must be a number' }).int().nonnegative().optional().default(0)),
  firstTimeDeposit: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'FTD must be a number' }).nonnegative().optional().default(0)),
  adExpense: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Ad Expense must be a number' }).nonnegative().optional().default(0)),
  adsCommission: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Ads Commission must be a number' }).nonnegative().optional().default(0)),
  adsChargeback: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Ad Chargeback must be a number' }).nonnegative().optional().default(0)),
  dailyBudget: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Daily Budget must be a number' }).nonnegative().optional().default(0)),
  topUpAmount: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Top-up Amount must be a number' }).nonnegative().optional().default(0)),
  adsViews: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Ad Views must be a number' }).int().nonnegative().optional().default(0)),
  adsClicks: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Ad Clicks must be a number' }).nonnegative().optional().default(0)),
  deposit: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Deposit must be a number' }).nonnegative().optional().default(0)),
  withdraw: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Withdraw must be a number' }).nonnegative().optional().default(0)),
});
const initialNewRow: Omit<NewVendorStatRow, 'tempId'> = {
  brandId: '',
  vendorId: '',
  statDate: new Date().toISOString().split('T')[0], // Default to today
  registration: '0',
  firstTimeDeposit: '0.00',
  adExpense: '0.00',
  adsCommission: '0.00',
  adsChargeback: '0.00',
  dailyBudget: '0.00',
  topUpAmount: '0.00',
  adsViews: '0',
  adsClicks: '0',
  deposit: '0.00',
  withdraw: '0.00',
};

export default function VendorStatEntryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<NewVendorStatRow[]>([{ ...initialNewRow, tempId: Date.now() }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendors, setVendors] = useState<(Vendor & { brand: Brand })[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { vendors, brands, userPermissions } = await getVendorStatEntryPageData();
        setVendors(vendors as any);
        setAllBrands(brands);
        setUserPermissions(new Set(userPermissions));
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') router.push('/unauthorized');
        toast.error("Failed to load page data.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  const canCreate = userPermissions.has('vendor-stats:create');

  const handleAddRow = () => {
    setRows(prev => [...prev, { ...initialNewRow, tempId: Date.now() }]);
  };

  const handleRemoveRow = (tempId: number) => {
    setRows(prev => prev.filter(row => row.tempId !== tempId));
  };

  const handleInputChange = (tempId: number, field: keyof NewVendorStatRow, value: string) => {
    setRows(prev =>
      prev.map(row => {
        if (row.tempId === tempId) {
          const newRow = { ...row, [field]: value };
          if (field === 'brandId') {
            newRow.vendorId = ''; // Reset vendor when brand changes
          }
          return newRow;
        }
        return row;
      })
    );
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all entries? This action cannot be undone.')) {
      setRows([{ ...initialNewRow, tempId: Date.now() }]);
      toast.info('All entries have been cleared.');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = [
      'statDate', 'brandName', 'vendorName', 'deposit', 'withdraw', 'registration', 'firstTimeDeposit',
      'adExpense', 'adsCommission', 'adsChargeback', 'dailyBudget', 'topUpAmount',
      'adsViews', 'adsClicks'
    ];
    const sampleVendor = vendors.length > 0 ? vendors[0] : { name: 'Sample Vendor', brandId: 0 };
    const sampleBrand = allBrands.find(b => b.id === sampleVendor.brandId)?.name || 'Sample Brand';
    const sampleData = [
      new Date().toISOString().split('T')[0], // statDate
      sampleBrand, // brandName
      sampleVendor.name, // vendorName
      '100.50', // deposit
      '20.00', // withdraw
      '10', // registration
      '5', // firstTimeDeposit
      '30.00', // adExpense
      '5.00', // adsCommission
      '2.50', // adsChargeback
      '200.00', // dailyBudget
      '50.00', // topUpAmount
      '1000', // adsViews
      '100', // adsClicks
    ];

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + sampleData.join(',') + '\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vendor_stats_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV template download started.");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        toast.error('Failed to read file.');
        return;
      }

      try {
        const lines = text.trim().split(/\r\n|\n/);
        const headers = lines[0].split(',').map(h => h.trim());
        const expectedHeaders = [
          'statDate', 'brandName', 'vendorName', 'deposit', 'withdraw', 'registration', 'firstTimeDeposit',
          'adExpense', 'adsCommission', 'adsChargeback', 'dailyBudget', 'topUpAmount',
          'adsViews', 'adsClicks'
        ];
        
        const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          toast.error(`Invalid CSV format. Missing headers: ${missingHeaders.join(', ')}`);
          return;
        }

        const newRows: NewVendorStatRow[] = [];
        const brandNameMap = new Map(allBrands.map(brand => [brand.name.toLowerCase(), brand.id.toString()]));
        
        let hasErrors = false;

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          if (lines[i].includes('Sample Vendor') && lines[i].includes('Sample Brand')) continue;

          const values = lines[i].split(',');
          const rowData: { [key: string]: string } = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index]?.trim() || '';
          });

          const brandName = rowData['brandName'];
          const brandId = brandNameMap.get(brandName?.toLowerCase());
          const vendorName = rowData['vendorName'];
          const vendor = vendors.find(a => a.name.toLowerCase() === vendorName?.toLowerCase() && a.brandId.toString() === brandId);
          const vendorId = vendor?.id.toString();

          if (!brandId) {
            toast.error(`Row ${i}: Brand "${brandName}" not found.`);
            hasErrors = true;
          }
          if (!vendorId) {
            toast.error(`Row ${i}: Vendor "${vendorName}" not found for brand "${brandName}".`);
            hasErrors = true;
          }

          const newRow: NewVendorStatRow = {
            ...initialNewRow,
            tempId: Date.now() + i,
            brandId: brandId || '',
            vendorId: vendorId || '',
            statDate: rowData['statDate'] || new Date().toISOString().split('T')[0],
            deposit: rowData['deposit'] || '0.00',
            withdraw: rowData['withdraw'] || '0.00',
            registration: rowData['registration'] || '0',
            firstTimeDeposit: rowData['firstTimeDeposit'] || '0.00',
            adExpense: rowData['adExpense'] || '0.00',
            adsCommission: rowData['adsCommission'] || '0.00',
            adsChargeback: rowData['adsChargeback'] || '0.00',
            dailyBudget: rowData['dailyBudget'] || '0.00',
            topUpAmount: rowData['topUpAmount'] || '0.00',
            adsViews: rowData['adsViews'] || '0',
            adsClicks: rowData['adsClicks'] || '0',
          };
          newRows.push(newRow);
        }

        if (newRows.length > 0) {
          if (rows.length === 1 && !rows[0].vendorId && !rows[0].brandId) {
            setRows(newRows);
          } else {
            setRows(prevRows => [...prevRows, ...newRows]);
          }
        }

        if (hasErrors) {
          toast.warning('CSV imported with errors. Please review the rows and correct any issues.');
        } else if (newRows.length > 0) {
          toast.success(`${newRows.length} rows imported successfully from CSV.`);
        }
      } catch (error) {
        toast.error("An error occurred while parsing the CSV file.");
        console.error(error);
      }
    };

    reader.onerror = () => toast.error('Failed to read the file.');
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validationResults = rows.map((row, index) => ({
      result: vendorStatSchema.safeParse(row),
      index,
    }));

    const errorRows = validationResults.filter(vr => !vr.result.success);
    
    if (errorRows.length > 0) {
      toast.warning("Please fix the validation errors before saving.", {
        description: "Review the highlighted fields or check the error messages for details."
      });
      errorRows.forEach(({ result, index }) => {
        if (!result.success) {
          result.error.errors.forEach(err => {
            toast.error(`Row ${index + 1}: ${err.message}`);
          });
        }
      });
      setIsSubmitting(false);
      return;
    }
    
    const uniqueEntries = new Set();
    let hasDuplicates = false;
    const duplicateMessages: string[] = [];
    for (const row of rows) {
      const key = `${row.vendorId}-${row.statDate}`;
      if (uniqueEntries.has(key)) {
        const vendorName = vendors.find(a => a.id.toString() === row.vendorId)?.name || 'Unknown Vendor';
        duplicateMessages.push(`Duplicate entry for vendor "${vendorName}" on date ${row.statDate}.`);
        hasDuplicates = true;
      }
      uniqueEntries.add(key);
    }

    if (hasDuplicates) {
      const confirmationMessage = `The following duplicate entries were found:\n\n- ${duplicateMessages.join('\n- ')}\n\nSaving will overwrite existing duplicates with the last entry in the table. Do you want to continue?`;
      if (!window.confirm(confirmationMessage)) {
        setIsSubmitting(false);
        toast.info('Save operation cancelled by user.');
        return;
      }
      toast.warning('Proceeding with save operation despite duplicate entries.');
    }

    const validResults = validationResults.filter(vr => vr.result.success);

    const dataToSubmit = validResults.map(({ result }) => {
        const { data } = result as z.SafeParseSuccess<z.infer<typeof vendorStatSchema>>;
        return {
            ...data,
            vendorId: parseInt(data.vendorId, 10),
        };
    }).filter((value, index, self) => self.findIndex(v => v.vendorId === value.vendorId && v.statDate.getTime() === value.statDate.getTime()) === index);

    if (dataToSubmit.length === 0) {
      toast.info("No valid data to submit.");
      setIsSubmitting(false);
      return;
    }

    const promise = createVendorStats(dataToSubmit as any);

    toast.promise(promise, {
      loading: 'Saving...',
      success: (result) => {
        if (result.error) {
          throw new Error(result.error);
        }
        setIsSubmitting(false);
        router.push('/vendor-stats');
        return `${dataToSubmit.length} stat entries saved successfully!`;
      },
      error: (err) => {
        setIsSubmitting(false);
        return err.message || 'Failed to add vendor stats.';
      },
    });
  };

  return (
    <div className="space-y-6">
      <nav className="text-sm mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="text-gray-500 hover:text-gray-700 flex items-center">
              <Home className="h-4 w-4 mr-2" /> Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <span className="text-gray-400">/</span>
              <Link href="/vendor-stats" className="ml-2 text-gray-500 hover:text-gray-700">
                Vendor Stats
              </Link>
            </div>
          </li>
          <li>
            <div className="flex items-center"><span className="text-gray-400">/</span><h1 className="ml-2 text-lg font-semibold text-gray-800">Add Multiple Stats</h1></div>
          </li>
        </ol>
      </nav>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
          <div className="flex justify-end items-center p-4 border-b border-gray-200 space-x-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100"
            >
              <Download size={16} className="mr-2" /> Download Template
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Upload size={16} className="mr-2" /> Upload CSV
            </button>
          </div>
          <div className="overflow-auto shadow-md sm:rounded-lg flex-grow">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr className="sticky top-0 bg-gray-50 z-10">
                  <th scope="col" className="px-4 py-6">Date</th>
                  <th scope="col" className="px-1 py-6 min-w-[180px]">Brand</th>
                  <th scope="col" className="px-1 py-6 min-w-[180px]">Vendor</th>
                  <th scope="col" className="px-1 py-6">Deposit</th>
                  <th scope="col" className="px-1 py-6">Withdraw</th>
                  <th scope="col" className="px-1 py-6">Reg</th>
                  <th scope="col" className="px-1 py-6">FTD</th>
                  <th scope="col" className="px-1 py-6">Ad Exp</th>
                  <th scope="col" className="px-1 py-6">Ads Comm</th>
                  <th scope="col" className="px-1 py-6">Chargeback</th>
                  <th scope="col" className="px-1 py-6">Budget</th>
                  <th scope="col" className="px-1 py-6">Top-up</th>
                  <th scope="col" className="px-1 py-6">Views</th>
                  <th scope="col" className="px-1 py-6">Clicks</th>
                  <th scope="col" className="px-4 py-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.tempId} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="date" value={row.statDate} onChange={(e) => handleInputChange(row.tempId, 'statDate', e.target.value)} className="w-32 h-8" />
                    </td>
                    <td className="px-1 py-3">
                      <AutocompleteDropdown
                        options={allBrands.map(brand => ({ value: brand.id.toString(), label: brand.name }))}
                        value={row.brandId}
                        onChange={(value) => handleInputChange(row.tempId, 'brandId', value || '')}
                        placeholder="Select Brand"
                        searchPlaceholder="Search brand..."
                        emptyText="No brand found."
                        className="w-full"
                      />
                    </td>
                    <td className="px-1 py-3">
                      <AutocompleteDropdown
                        options={vendors
                          .filter(vendor => row.brandId ? vendor.brandId.toString() === row.brandId : false)
                          .map(vendor => ({ value: vendor.id.toString(), label: vendor.name }))
                        }
                        value={row.vendorId}
                        onChange={(value) => handleInputChange(row.tempId, 'vendorId', value || '')}
                        placeholder="Select Vendor"
                        searchPlaceholder="Search vendor..."
                        emptyText="No vendor found."
                        className="w-full"
                        disabled={!row.brandId}
                      />
                    </td>
                    <td className="px-1 py-3"><input type="number" step="0.01" value={row.deposit} onChange={(e) => handleInputChange(row.tempId, 'deposit', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-1 py-3"><input type="number" step="0.01" value={row.withdraw} onChange={(e) => handleInputChange(row.tempId, 'withdraw', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-1 py-3"><input type="number" value={row.registration} onChange={(e) => handleInputChange(row.tempId, 'registration', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-1 py-3"><input type="number" step="0.01" value={row.firstTimeDeposit} onChange={(e) => handleInputChange(row.tempId, 'firstTimeDeposit', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-1 py-3"><input type="number" step="0.01" value={row.adExpense} onChange={(e) => handleInputChange(row.tempId, 'adExpense', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-1 py-3"><input type="number" step="0.01" value={row.adsCommission} onChange={(e) => handleInputChange(row.tempId, 'adsCommission', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-1 py-3"><input type="number" step="0.01" value={row.adsChargeback} onChange={(e) => handleInputChange(row.tempId, 'adsChargeback', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-1 py-3"><input type="number" step="0.01" value={row.dailyBudget} onChange={(e) => handleInputChange(row.tempId, 'dailyBudget', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-1 py-3"><input type="number" step="0.01" value={row.topUpAmount} onChange={(e) => handleInputChange(row.tempId, 'topUpAmount', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-1 py-3"><input type="number" value={row.adsViews} onChange={(e) => handleInputChange(row.tempId, 'adsViews', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-1 py-3"><input type="number" value={row.adsClicks} onChange={(e) => handleInputChange(row.tempId, 'adsClicks', e.target.value)} className="w-18 h-8" /></td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.tempId)}
                        className="text-red-600 hover:text-red-800"
                        disabled={rows.length === 1}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td colSpan={15} className="p-2 text-center">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <Plus size={18} className="mr-2" /> Add Row
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex justify-end items-center mt-4 space-x-4">
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              disabled={isSubmitting || !canCreate}
            >
              Clear All
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isSubmitting || !canCreate}
            >
              {isSubmitting ? 'Saving...' : 'Save All Stats'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}