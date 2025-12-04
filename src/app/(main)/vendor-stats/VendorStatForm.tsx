'use client';

import { useState, useEffect } from 'react';
import { updateVendorStat, createVendorStat } from './actions';
import { toast } from 'sonner';
import { z } from 'zod';
import ResizableSidebar from '@/components/ui/ResizableSidebar';
import { Vendor, VendorStat, Brand } from '@prisma/client';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';

type VendorStatWithRelations = VendorStat & {
  vendor: Vendor & {
    brand: Brand;
  };
};

interface VendorStatFormProps {
  stat: VendorStatWithRelations | null;
  vendors: (Vendor & { brand: Brand })[];
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
}


const initialFormData = {
  vendorId: '',
  statDate: '',
  vendorName: '',
  brandName: '',
  registration: '',
  firstTimeDeposit: '0.00',
  adExpense: '0.00',
  adsCommission: '0.00',
  dailyBudget: '0.00',
  topUpAmount: '0.00',
  adsViews: '0',
  adsClicks: '',
  adsChargeback: '0.00',
  deposit: '0.00',
  withdraw: '0.00',
};

// Preprocess empty strings to undefined so that zod can apply defaults.
const numberPreprocess = (val: unknown) => (val === '' || val === null ? undefined : Number(val));

const vendorStatUpdateSchema = z.object({
  vendorId: z.string().optional(),
  statDate: z.coerce.date({ errorMap: () => ({ message: 'Please select a valid date' }) }),
  registration: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Registrations must be a number' }).int().nonnegative().optional().default(0)),
  firstTimeDeposit: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'FTD must be a number' }).int().nonnegative().optional().default(0)),
  adExpense: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Ad Expense must be a number' }).nonnegative().optional().default(0)),
  adsCommission: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Ads Commission must be a number' }).nonnegative().optional().default(0)),
  dailyBudget: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Daily Budget must be a number' }).nonnegative().optional().default(0)),
  topUpAmount: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Top-up Amount must be a number' }).nonnegative().optional().default(0)),
  adsViews: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Ad Views must be a number' }).int().nonnegative().optional().default(0)),
  adsClicks: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Ad Clicks must be a number' }).nonnegative().optional().default(0)),
  adsChargeback: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Ad Chargeback must be a number' }).nonnegative().optional().default(0)),
  deposit: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Deposit must be a number' }).nonnegative().optional().default(0)),
  withdraw: z.preprocess(numberPreprocess, z.number({ invalid_type_error: 'Withdraw must be a number' }).nonnegative().optional().default(0)),
});

const vendorStatCreateSchema = vendorStatUpdateSchema.extend({
  vendorId: z.string().min(1, { message: 'Vendor is required' }),
});

export default function VendorStatForm({ stat, vendors, isOpen, onClose, canCreate, canUpdate }: VendorStatFormProps) {
  const [formData, setFormData] = useState(initialFormData);
  const isEditMode = !!stat;
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  const uniqueBrands = Array.from(new Map(vendors.map(vendor => [vendor.brand.id, vendor.brand])).values())
    .sort((a, b) => a.name.localeCompare(b.name));
  const filteredVendors = vendors.filter(vendor => selectedBrandId ? vendor.brandId.toString() === selectedBrandId : true);

  useEffect(() => {
    if (stat) {
      setFormData({
        vendorId: stat.vendorId.toString(),
        statDate: stat.statDate ? new Date(stat.statDate).toISOString().split('T')[0] : '',
        vendorName: stat.vendor.name,
        brandName: stat.vendor.brand.name,
        registration: String(stat.registration),
        firstTimeDeposit: String(stat.firstTimeDeposit),
        adExpense: String(stat.adExpense),
        adsCommission: String(stat.adsCommission),
        dailyBudget: String(stat.dailyBudget),
        topUpAmount: String(stat.topUpAmount),
        adsViews: String(stat.adsViews),
        adsClicks: String(stat.adsClicks),
        adsChargeback: String(stat.adsChargeback),
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
  }, [stat, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    const schema = isEditMode ? vendorStatUpdateSchema : vendorStatCreateSchema;

    const parsedData = schema.safeParse(formData);

    if (!parsedData.success) {
      parsedData.error.errors.forEach(err => {
        toast.error(`${err.path.join('.')} - ${err.message}`);
      });
      return;
    }

    if (isEditMode && stat) {
      const { vendorId, statDate, ...dataToUpdate } = parsedData.data;

      const result = await updateVendorStat({
        id: stat.id,
        ...dataToUpdate,
      });

      if (result.error) {
        toast.error('Update failed', { description: result.error });
      } else {
        toast.success('Stats updated successfully!');
        onClose();
      }
    } else {
      const { vendorId, ...dataToCreate } = parsedData.data as z.infer<typeof vendorStatCreateSchema>;
      const result = await createVendorStat({
        ...dataToCreate,
        vendorId: parseInt(vendorId, 10),
      });

      if (result.error) {
        toast.error('Create failed', { description: result.error });
      } else {
        toast.success('Stat created successfully!');
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const renderInputField = (
    label: string,
    name: keyof typeof formData,
    type = 'number',
    readOnly = false
  ) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        id={name}
        value={formData[name]}
        onChange={handleInputChange}
        className={`mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${readOnly ? 'cursor-not-allowed' : ''}`}
        step={type === 'number' ? '0.01' : undefined}
        readOnly={readOnly}
      />
    </div>
  );

  const canSubmit = isEditMode ? canUpdate : canCreate;

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Vendor Stats" : "Create Vendor Stat"}
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" form="stat-form" disabled={!canSubmit} className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
            {isEditMode ? "Update Stats" : "Create Stat"}
          </button>
        </div>
      }
    >
      <form id="stat-form" onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden pt-6">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
            {renderInputField('Date', 'statDate', 'date', isEditMode)}
            <div className="grid grid-cols-2 gap-x-4">
              {isEditMode ? (
                <>
                  {renderInputField('Vendor', 'vendorName', 'text', true)}
                  {renderInputField('Brand', 'brandName', 'text', true)}
                </>
              ) : (
                <div className="col-span-2 grid grid-cols-1 gap-y-4 p-1">
                  <AutocompleteDropdown
                    options={uniqueBrands.map(brand => ({ value: brand.id.toString(), label: brand.name }))}
                    value={selectedBrandId}
                    onChange={handleBrandChange}
                    placeholder="Select a Brand"
                    searchPlaceholder="Search brand..."
                    emptyText="No brand found."
                  />
                  <AutocompleteDropdown
                    options={filteredVendors.map(vendor => ({ value: vendor.id.toString(), label: vendor.name }))}
                    value={formData.vendorId}
                    onChange={handleVendorChange}
                    placeholder="Select an Vendor"
                    searchPlaceholder="Search vendor..."
                    emptyText="No vendor found."
                    disabled={!selectedBrandId}
                  />
                </div>
              )}
              {renderInputField('Registrations', 'registration')}
              {renderInputField('FTD', 'firstTimeDeposit', 'number')}
              {renderInputField('Ad Expense', 'adExpense')}
              {renderInputField('Ads Commission', 'adsCommission')}
              {renderInputField('Daily Budget', 'dailyBudget')}
              {renderInputField('Top-up Amount', 'topUpAmount')}
              {renderInputField('Ad Views', 'adsViews')}
              {renderInputField('Ad Clicks', 'adsClicks')}
              {renderInputField('Ad Chargeback', 'adsChargeback')}
              {renderInputField('Deposit', 'deposit')}
              {renderInputField('Withdraw', 'withdraw')}
            </div>
        </div>
      </form>
    </ResizableSidebar>
  );
}