'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Vendor, Brand } from '@prisma/client';
import { upsertVendorDepositsForMonth, getVendorDepositsForMonth } from './actions';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import ResizableSidebar from '@/components/ui/ResizableSidebar';
import { eachDayOfInterval, endOfMonth, startOfMonth } from 'date-fns';

interface DepositEntry {
  date: Date;
  deposit: string;
  withdraw: string;
  originalDeposit: string;
  originalWithdraw: string;
}

interface VendorDepositEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: (Vendor & { brand: Brand })[];
  brands: Brand[];
  canCreate: boolean;
  canUpdate: boolean;
}

export default function VendorDepositEntryForm({
  isOpen,
  onClose,
  vendors,
  brands,
  canCreate,
  canUpdate,
}: VendorDepositEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Table data
  const [entries, setEntries] = useState<DepositEntry[]>([]);

  const generateTableRows = useCallback(async () => {
    if (!selectedVendorId || !selectedYear || !selectedMonth) {
      setEntries([]);
      return;
    }

    setLoading(true);
    const startDate = startOfMonth(new Date(selectedYear, selectedMonth - 1));
    const endDate = endOfMonth(startDate);
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

    try {
      const existingData = await getVendorDepositsForMonth(parseInt(selectedVendorId), selectedYear, selectedMonth);
      const dataMap = new Map(existingData.map(d => [new Date(d.statDate).toDateString(), d]));

      const newEntries = daysInMonth.map(day => {
        const existingEntry = dataMap.get(day.toDateString());
        const deposit = existingEntry?.deposit.toString() || '';
        const withdraw = existingEntry?.withdraw.toString() || '';
        return {
          date: day,
          deposit,
          withdraw,
          originalDeposit: deposit,
          originalWithdraw: withdraw,
        };
      });
      setEntries(newEntries);
    } catch (error) {
      toast.error("Failed to load existing deposit data.");
    } finally {
      setLoading(false);
    }
  }, [selectedVendorId, selectedYear, selectedMonth, setLoading]);

  useEffect(() => {
    // Reset state when sidebar opens
    if (isOpen) {
      setSelectedBrandId(null);
      setSelectedVendorId(null);
      setSelectedYear(new Date().getFullYear());
      setSelectedMonth(new Date().getMonth() + 1);
      setEntries([]);
    }
  }, [isOpen]);

  useEffect(() => {
    generateTableRows();
  }, [generateTableRows]);

  const handleInputChange = (date: Date, field: 'deposit' | 'withdraw', value: string) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.date.getTime() === date.getTime() ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || !selectedYear || !selectedMonth) {
      toast.error('Please select a vendor, year, and month.');
      return;
    }

    const changedEntries = entries.filter(
      entry => (entry.deposit || entry.withdraw) && // must have some value
               (entry.deposit !== entry.originalDeposit || entry.withdraw !== entry.originalWithdraw) // and it must be changed
    );

    if (changedEntries.length === 0) {
      toast.info('No data to save.');
      return;
    }

    setIsSubmitting(true);

    const result = await upsertVendorDepositsForMonth({
      vendorId: parseInt(selectedVendorId),
      year: selectedYear,
      month: selectedMonth,
      entries: changedEntries,
    });

    if ('error' in result && result.error) {
      toast.error('Save failed', { description: result.error });
    } else {
      toast.success('Deposit data saved successfully!');
      onClose();
    }

    setIsSubmitting(false);
  };

  const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const date = new Date(selectedYear, i);
    const isDisabled = selectedYear === new Date().getFullYear() && month > new Date().getMonth() + 1;
    return {
      value: month,
      label: date.toLocaleString('default', { month: 'long' }),
      disabled: isDisabled,
    };
  });

  const filteredVendors = useMemo(() => {
    if (!selectedBrandId) return vendors;
    return vendors.filter(v => v.brandId.toString() === selectedBrandId);
  }, [vendors, selectedBrandId]);

  const canSubmit = canCreate || canUpdate;

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Deposit/Withdrawal Entry"
      initialWidth={640}
      footer={
        <div className="flex justify-end mt-6">
          <button
            type="submit"
            form="vendor-deposit-form"
            disabled={isSubmitting || !canSubmit}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
          >
            <Save size={18} className="mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form id="vendor-deposit-form" onSubmit={handleSubmit} className="flex flex-col h-full pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-1">
          <AutocompleteDropdown
            options={brands.map(b => ({ value: b.id.toString(), label: b.name }))}
            value={selectedBrandId}
            onChange={value => { setSelectedBrandId(value); setSelectedVendorId(null); }}
            placeholder="Select Brand"
            searchPlaceholder="Search brands..."
            emptyText="No brands found."
          />
          <AutocompleteDropdown
            options={filteredVendors.map(v => ({ value: v.id.toString(), label: v.name }))}
            value={selectedVendorId}
            onChange={setSelectedVendorId}
            placeholder="Select Vendor"
            searchPlaceholder="Search vendors..."
            emptyText="No vendors found."
            disabled={!selectedBrandId}
          />
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="h-[42px] pl-2 bg-white border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
            {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="h-[42px] pl-2 bg-white border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
            {monthOptions.map(month => <option key={month.value} value={month.value} disabled={month.disabled}>{month.label}</option>)}
          </select>
        </div>

        <div className="flex-grow overflow-y-auto px-4 pb-12 -mr-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 relative">
          {loading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><p>Loading month data...</p></div>}
          {entries.length > 0 && (
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3">Date</th>
                  <th scope="col" className="px-6 py-3 text-right">Deposit</th>
                  <th scope="col" className="px-6 py-3 text-right">Withdraw</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.date.toISOString()} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
                      {entry.date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.deposit}
                        onChange={e => handleInputChange(entry.date, 'deposit', e.target.value)}
                        className="w-32 h-8 text-right border-gray-300 rounded-md"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-6 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.withdraw}
                        onChange={e => handleInputChange(entry.date, 'withdraw', e.target.value)}
                        className="w-32 h-8 text-right border-gray-300 rounded-md"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </form>
    </ResizableSidebar>
  );
}