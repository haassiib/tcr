'use client';

import { useState, useEffect, useMemo } from 'react';
import { Vendor, Brand, VendorStat } from '@prisma/client';
import { updateVendorDeposit } from './actions';
import { toast } from 'sonner';
import { z } from 'zod';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import ResizableSidebar from '@/components/ui/ResizableSidebar';

type VendorStatWithRelations = VendorStat & {
  vendor: Vendor & { brand: Brand };
};

interface VendorDepositFormProps {
  isOpen: boolean;
  onClose: () => void;
  stat: VendorStatWithRelations | null;
  vendors: (Vendor & { brand: Brand })[];
  brands: Brand[];
  canCreate: boolean;
  canUpdate: boolean;
}

const initialFormData = {
  vendorId: '',
  statDate: '',
  deposit: '0.00',
  withdraw: '0.00',
};

const numberPreprocess = (val: unknown) => (val === '' || val === null ? undefined : Number(val));

const depositSchema = z.object({
  vendorId: z.string().min(1, { message: 'Vendor is required' }),
  statDate: z.coerce.date({ errorMap: () => ({ message: 'Please select a valid date' }) }),
  deposit: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Deposit must be a number' }).nonnegative().optional().default(0)),
  withdraw: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Withdraw must be a number' }).nonnegative().optional().default(0)),
});

export default function VendorDepositForm({
  isOpen,
  onClose,
  stat,
  vendors,
  brands,
  canCreate,
  canUpdate,
}: VendorDepositFormProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const isEditMode = !!stat;

  useEffect(() => {
    if (isOpen) {
      if (stat) {
        const brandId = vendors.find(v => v.id === stat.vendorId)?.brandId.toString() || null;
        setSelectedBrandId(brandId);
        setFormData({
          vendorId: stat.vendorId?.toString() ?? '',
          statDate: stat.statDate ? new Date(stat.statDate).toISOString().split('T')[0] : '',
          deposit: String(stat.deposit),
          withdraw: String(stat.withdraw),
        });
      } else {
        setFormData({
          ...initialFormData,
          statDate: new Date().toISOString().split('T')[0],
        });
        setSelectedBrandId(null);
      }
    }
  }, [stat, isOpen, vendors]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVendorChange = (vendorId: string | null) => {
    setFormData(prev => ({ ...prev, vendorId: vendorId || '' }));
  };

  const handleBrandChange = (brandId: string | null) => {
    setSelectedBrandId(brandId);
    setFormData(prev => ({ ...prev, vendorId: '' })); // Reset vendor when brand changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedData = depositSchema.safeParse(formData);

    if (!parsedData.success) {
      parsedData.error.errors.forEach(err => toast.error(`${err.path.join('.')} - ${err.message}`));
      return;
    }

    setIsSubmitting(true);
    const result = await updateVendorDeposit({
      id: stat?.id,
      ...parsedData.data, // Spread other data
      // Convert vendorId to number as expected by the action
      vendorId: parseInt(parsedData.data.vendorId, 10),

    });

    if ('error' in result && result.error) {
      toast.error('Save failed', { description: result.error });
    } else {
      toast.success(`Funding entry ${isEditMode ? 'updated' : 'created'} successfully!`);
      onClose();
    }

    setIsSubmitting(false);
  };

  const filteredVendors = useMemo(() => {
    if (!selectedBrandId) return [];
    return vendors.filter(v => v.brandId.toString() === selectedBrandId);
  }, [vendors, selectedBrandId]);

  const canSubmit = canCreate || canUpdate;

  if (!isOpen) return null;

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Vendor Funding" : "New Vendor Funding"}
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            type="submit"
            form="deposit-form"
            disabled={isSubmitting || !canSubmit}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isEditMode ? "Update Entry" : "Create Entry"}
          </button>
        </div>
      }
    >
      <form id="deposit-form" onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden pt-6">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
          <div className="mb-4">
            <label htmlFor="statDate" className="block text-sm font-medium text-gray-700">Date</label>
            <input type="date" name="statDate" id="statDate" value={formData.statDate} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm" required readOnly={isEditMode} />
          </div>
          <div className="mb-4">
            <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">Brand</label>
            <AutocompleteDropdown
              options={brands.map(b => ({ value: b.id.toString(), label: b.name }))}
              value={selectedBrandId} onChange={handleBrandChange} placeholder="Select a Brand"
              searchPlaceholder="Search brands..."
              emptyText="No brands found."
              disabled={isEditMode} />
          </div>
          <div className="mb-4">
            <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700">Vendor</label>
            <AutocompleteDropdown
              options={filteredVendors.map(v => ({ value: v.id.toString(), label: v.name }))}
              value={formData.vendorId}
              onChange={handleVendorChange}
              placeholder="Select a Vendor"
              searchPlaceholder="Search vendors..."
              emptyText="No vendors found."
              disabled={isEditMode || !selectedBrandId} />
          </div>
          <div className="mb-4">
            <label htmlFor="deposit" className="block text-sm font-medium text-gray-700">Deposit</label>
            <input type="number" name="deposit" id="deposit" value={formData.deposit} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm" step="0.01" />
          </div>
          <div className="mb-4">
            <label htmlFor="withdraw" className="block text-sm font-medium text-gray-700">Withdraw</label>
            <input type="number" name="withdraw" id="withdraw" value={formData.withdraw} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm" step="0.01" />
          </div>
        </div>
      </form>
    </ResizableSidebar>
  );
}