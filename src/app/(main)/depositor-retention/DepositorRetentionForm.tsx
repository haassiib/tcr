'use client';

import { useState, useEffect } from 'react';
import { createOrUpdateMultipleDepositorRetention } from './actions';
import ResizableSidebar from '@/components/ui/ResizableSidebar';
import { Vendor, Brand, DepositorRetention } from '@prisma/client';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import { z } from 'zod';
import { toast } from 'sonner';

const formSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required."),
  year: z.coerce.number(),
  month: z.coerce.number(),
});

type RorEntry = { dayName: string; percentage: string; originalPercentage: string; dateOfReturn: string; id?: number };

interface DepositorRetentionFormProps {
  entries: (DepositorRetention & { vendor?: { name: string } })[]; // Pass all entries for the selected date/vendor
  vendors: Pick<Vendor, 'id' | 'name' | 'brandId'>[];
  brands: Pick<Brand, 'id' | 'name'>[];
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  routePath: string;
}

export default function DepositorRetentionForm({ entries, vendors, brands, isOpen, onClose, canCreate, canUpdate, routePath }: DepositorRetentionFormProps) {
  const dayOptions = ["NFD", "D1", "D3", "D7", "D15", "D30"];

  const [formData, setFormData] = useState({
    vendorId: '',
    year: '',
    month: '',
  });
  const [rorData, setRorData] = useState<RorEntry[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  const calculateReturnDate = (dayName: string, year: number, month: number): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    switch (dayName) {
      case 'NFD':
      case 'D1':
        return new Date(year, month - 1, 1).toLocaleDateString('en-US', options);
      case 'D3':
        return new Date(year, month - 1, 3).toLocaleDateString('en-US', options);
      case 'D7':
        return new Date(year, month - 1, 7).toLocaleDateString('en-US', options);
      case 'D15':
        return new Date(year, month - 1, 15).toLocaleDateString('en-US', options);
      case 'D30':
        return new Date(year, month, 0).toLocaleDateString('en-US', options); // Last day of the month
      default:
        return '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      const isEditing = entries.length > 0;
      const initialVendorId = isEditing ? String(entries[0].vendorId) : '';
      const referenceDate = isEditing ? new Date(entries[0].dateOfReturn) : new Date();

      const initialYear = String(referenceDate.getFullYear());
      const initialMonth = String(referenceDate.getMonth() + 1); // 1-12

      setFormData({ vendorId: initialVendorId, year: initialYear, month: initialMonth });

      const vendor = vendors.find(a => a.id === parseInt(initialVendorId, 10));
      setSelectedBrandId(vendor ? String(vendor.brandId) : null);

      if (!isEditing) {
        // Explicitly reset vendor and brand for new entries
        setSelectedBrandId(null);
      }
    }
  }, [entries, isOpen, vendors]);

  useEffect(() => {
    if (isOpen && formData.year && formData.month) {
      const tableData = dayOptions.map(day => {
        const existingEntry = entries.find(e => e.dayName === day);
        const originalPercentage = existingEntry ? String(existingEntry.percentage) : '0';
        return {
          dayName: day,
          percentage: originalPercentage,
          originalPercentage: originalPercentage,
          dateOfReturn: calculateReturnDate(day, parseInt(formData.year, 10), parseInt(formData.month, 10)),
          id: existingEntry?.id,
        };
      });
      setRorData(tableData);
    }
  }, [isOpen, formData.year, formData.month, entries]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePercentageChange = (dayName: string, value: string) => {
    setRorData(prev => prev.map(item => item.dayName === dayName ? { ...item, percentage: value } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validationResult = formSchema.safeParse(formData);

    if (!validationResult.success) {
      const newErrors: Record<string, string> = {};
      validationResult.error.issues.forEach(issue => { newErrors[issue.path[0]] = issue.message; });
      setErrors(newErrors);
      toast.warning('Please correct the errors in the form.');
      return;
    }

    const percentagesToSave = rorData
      .filter(item => item.percentage !== item.originalPercentage)
      .map(item => ({
        dayName: item.dayName,
        dateOfReturn: new Date(item.dateOfReturn),
        percentage: parseFloat(item.percentage) || 0,
        id: item.id,
      }));

    if (percentagesToSave.length === 0) {
      toast.info("No changes were made.");
      onClose();
      return;
    }

    const result = await createOrUpdateMultipleDepositorRetention({
      vendorId: parseInt(validationResult.data.vendorId, 10),
      percentages: percentagesToSave,
      routePath,
    });

    if ('error' in result && result.error) {
      toast.error('Operation Failed', { description: result.error });
    } else {
      toast.success(entries.length > 0 ? 'ROR entries updated successfully.' : 'ROR entries created successfully.');
      onClose();
    }
  };

  if (!isOpen) return null;

  const canSubmit = canCreate && canUpdate;
  const isEditing = entries.length > 0;

  const allMonths = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const availableMonths = parseInt(formData.year, 10) === currentYear
    ? allMonths.filter(m => m.value <= currentMonth)
    : allMonths;

  const brandOptions = brands.map(b => ({ value: String(b.id), label: b.name }));
  const filteredVendorOptions = vendors
    .filter(vendor => selectedBrandId ? vendor.brandId === parseInt(selectedBrandId, 10) : true)
    .map(vendor => ({ value: String(vendor.id), label: vendor.name }));

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={entries.length > 0 ? 'Edit Depositor ROR' : 'Create New Depositor ROR'}
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" form="ror-form" disabled={!canSubmit} className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">Save Entries</button>
        </div>
      }
    >
      <form id="ror-form" onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden pt-6">
        <div className="flex-grow overflow-y-auto pr-4 pl-4 -mr-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
          <div className="mb-4">
            <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">Brand</label>
            <AutocompleteDropdown
              options={brandOptions}
              value={selectedBrandId}
              onChange={value => { setSelectedBrandId(value); setFormData(p => ({ ...p, vendorId: '' })); }}
              placeholder="Select a brand"
              searchPlaceholder="Search for a brand..."
              emptyText="No brands found."
              disabled={isEditing} />
          </div>
          <div className="mb-4">
            <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700">Vendor</label>
            <AutocompleteDropdown
              options={filteredVendorOptions}
              value={formData.vendorId}
              onChange={value => setFormData(p => ({ ...p, vendorId: value || '' }))}
              placeholder="Select a vendor"
              searchPlaceholder="Search for a vendor..."
              emptyText="No vendors found."
              disabled={isEditing || !selectedBrandId} />
            {errors.vendorId && <p className="mt-1 text-sm text-red-600">{errors.vendorId}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
              <input type="number" name="year" value={formData.year} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-200" required disabled />
              {errors.year && <p className="mt-1 text-sm text-red-600">{errors.year}</p>}
            </div>
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700">Month</label>
              <select name="month" value={formData.month} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required disabled={isEditing}>
                {availableMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              {errors.month && <p className="mt-1 text-sm text-red-600">{errors.month}</p>}
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Return Percentages</h3>
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date of Return</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Percentage (%)</th>
                </tr>
              </thead>
              <tbody>
                {rorData.map((item) => (
                  <tr key={item.dayName} className="border-b border-gray-200">
                    <td className="px-3 py-2 font-medium text-gray-800">{item.dayName}</td>
                    <td className="px-3 py-2">
                      <input type="text" value={item.dateOfReturn} readOnly className="w-full px-2 py-1 rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm cursor-default" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" value={item.percentage} onChange={(e) => handlePercentageChange(item.dayName, e.target.value)} className="w-full px-2 py-1 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </ResizableSidebar>
  );
}