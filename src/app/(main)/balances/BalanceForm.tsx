'use client';

import { useState, useEffect } from 'react';
import { createOrUpdateBalance } from './actions';
import ResizableSidebar from '@/components/ui/ResizableSidebar';
import { Vendor, VendorMonthlyBalance, Brand } from '@prisma/client';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import { z } from 'zod';
import { toast } from 'sonner';

// Define a schema for validation and serialization
const balanceSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required."),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
  closingBalance: z.coerce.number(),
});


interface BalanceFormProps {
  balance: (VendorMonthlyBalance & { vendor: { name: string } }) | null;
  vendors: (Vendor & { brandId: number })[];
  brands: Pick<Brand, 'id' | 'name'>[];
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  routePath: string;
}

export default function BalanceForm({ balance, vendors, brands, isOpen, onClose, canCreate, canUpdate, routePath }: BalanceFormProps) {
  const [formData, setFormData] = useState({
    vendorId: '',
    month: '',
    year: '',
    closingBalance: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  useEffect(() => {
    if (balance) {
      setFormData({
        vendorId: String(balance.vendorId),
        month: String(balance.month),
        year: String(balance.year),
        closingBalance: String(balance.closingBalance),
      });
      // Find and set the brand for the existing entry
      const vendor = vendors.find(a => a.id === balance.vendorId);
      setSelectedBrandId(vendor ? String(vendor.brandId) : null);
    } else {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // Jan is 0, so prev month is correct
      setFormData({
        vendorId: '',
        month: String(currentMonth === 0 ? 12 : currentMonth),
        year: String(currentMonth === 0 ? currentYear - 1 : currentYear),
        closingBalance: '',
      });
      setSelectedBrandId(null);
    }
    setErrors({}); // Clear errors when form opens or balance changes
  }, [balance, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validationResult = balanceSchema.safeParse(formData);

    if (!validationResult.success) {
      const newErrors: Record<string, string> = {};
      validationResult.error.issues.forEach(issue => {
        newErrors[issue.path[0]] = issue.message;
      });
      setErrors(newErrors);
      toast.warning('Please correct the errors in the form.');
      return;
    }

    // Custom validation to prevent entry for current or future months
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed

    const selectedYear = validationResult.data.year;
    const selectedMonth = validationResult.data.month;

    if (selectedYear > currentYear) {
      const errorMessage = 'Entry for current or future months is not allowed.';
      setErrors(prev => ({ ...prev, month: errorMessage }));
      toast.error('Invalid Month', { description: 'You cannot create or update a balance for the current or a future month.' });
      return;
    } else if (selectedYear === currentYear && selectedMonth > currentMonth) {
      const errorMessage = 'Entry for current or future years is not allowed.';
      setErrors(prev => ({ ...prev, year: errorMessage }));
      toast.error('Invalid Year', { description: 'You cannot create or update a balance for the current or a future year.' });
      return;
    }


    // Data is serialized by zod (e.g., strings converted to numbers)
    const serializedData = {
      ...validationResult.data,
      id: balance?.id,
      routePath,
    };

    const result = await createOrUpdateBalance(serializedData);
    if (result.error) {
      toast.error('Operation Failed', { description: result.error });
    } else {
      const successMessage = balance ? 'Balance updated successfully.' : 'New balance entry created.';
      toast.success(successMessage);
      onClose();
    }
  };

  if (!isOpen) return null;

  const canSubmit = balance ? canUpdate : canCreate;

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

  const brandOptions = brands.map(brand => ({
    value: String(brand.id),
    label: brand.name,
  }));

  const filteredVendorOptions = vendors
    .filter(vendor => selectedBrandId ? vendor.brandId === parseInt(selectedBrandId, 10) : true)
    .map(vendor => ({
    value: String(vendor.id),
    label: vendor.name,
  }));

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={balance ? 'Edit Monthly Balance' : 'Create New Monthly Balance'}
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" form="balance-form" disabled={!canSubmit} className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">{balance ? 'Update Balance' : 'Create Balance'}</button>
        </div>
      }
    >
      <form id="balance-form" onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden pt-6">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
            <div className="mb-4">
              <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">Brand</label>
              <div className="mt-1">
                <AutocompleteDropdown
                  options={brandOptions}
                  value={selectedBrandId}
                  onChange={(value) => {
                    setSelectedBrandId(value);
                    setFormData(prev => ({ ...prev, vendorId: '' })); // Reset vendor on brand change
                  }}
                  placeholder="Select a brand"
                  searchPlaceholder="Search for a brand..."
                  emptyText="No brands found."
                  disabled={!!balance} // Disable if editing
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700">Vendor</label>
              <div className="mt-1">
                <AutocompleteDropdown
                  options={filteredVendorOptions}
                  value={formData.vendorId}
                  onChange={(value) => setFormData(prev => ({ ...prev, vendorId: value || '' }))}
                  placeholder="Select an vendor"
                  searchPlaceholder="Search for an vendor..."
                  emptyText="No vendors found."
                  disabled={!!balance || !selectedBrandId} // Disable if editing or no brand is selected
                />
              </div>
              {errors.vendorId && <p className="mt-1 text-sm text-red-600">{errors.vendorId}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="month" className="block text-sm font-medium text-gray-700">Month</label>
                <select name="month" id="month" value={formData.month} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required disabled={!!balance}>
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                
              </div>
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
                <input type="number" name="year" id="year" value={formData.year} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required disabled={!!balance} />
                
              </div>
            </div>
             <div className="mb-4">
              {errors.month && <p className="mt-1 text-sm text-red-600">{errors.month}</p>}
              {errors.year && <p className="mt-1 text-sm text-red-600">{errors.year}</p>}
             </div>
            <div className="mb-4">
              <label htmlFor="closingBalance" className="block text-sm font-medium text-gray-700">Closing Balance</label>
              <input type="number" step="0.01" name="closingBalance" id="closingBalance" value={formData.closingBalance} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
              {errors.closingBalance && <p className="mt-1 text-sm text-red-600">{errors.closingBalance}</p>}
            </div>
        </div>
      </form>
    </ResizableSidebar>
  );
}