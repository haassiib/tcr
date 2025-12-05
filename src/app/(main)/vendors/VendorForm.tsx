'use client';

import { useState, useEffect } from 'react';
import { createOrUpdateVendor } from './actions'; // Already updated
import { toast } from 'sonner';
import ResizableSidebar from '@/components/ui/ResizableSidebar';
import { Vendor, Brand, User } from '@prisma/client'; // Already updated

interface VendorFormProps { // Already updated
  vendor: Vendor | null; // Already updated
  brands: Brand[];
  users: User[];
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
}

const initialFormData = {
  name: '',
  description: '',
  brandId: '',
  userId: '',
  isActive: false,
};

export default function VendorForm({ vendor, brands, users, isOpen, onClose, canCreate, canUpdate }: VendorFormProps) {
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        description: vendor.description || '',
        brandId: vendor.brandId.toString(),
        userId: vendor.userId.toString(),
        isActive: vendor.isActive,
      });
    } else {
      setFormData(initialFormData);
    }
  }, [vendor, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement >) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createOrUpdateVendor({
      id: vendor?.id,
      name: formData.name,
      description: formData.description,
      brandId: parseInt(formData.brandId, 10),
      userId: parseInt(formData.userId, 10),
      isActive: formData.isActive,
    });

    if ('error' in result && result.error) {
      toast.error('Operation Failed', { description: result.error });
    } else {
      const successMessage = vendor ? 'Vendor updated successfully.' : 'Vendor created successfully.';
      toast.success(successMessage);
      onClose();
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const canSubmit = vendor ? canUpdate : canCreate; // Already updated

  if (!isOpen) return null;

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={vendor ? 'Edit Vendor' : 'Create New Vendor'} // Already updated
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" form="vendor-form" disabled={!canSubmit} className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">{vendor ? 'Update Vendor' : 'Create Vendor'}</button>
        </div>
      }
    >
      <form id="vendor-form" onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden pt-6">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
          </div>
            <div className="mb-4">
              <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">Brand</label>
              <select name="brandId" id="brandId" value={formData.brandId} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required>
                <option value="">Select a brand</option>
                {brands.map(brand => (<option key={brand.id} value={brand.id}>{brand.name}</option>))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700">User</label>
              <select name="userId" id="userId" value={formData.userId} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required>
                <option value="">Select a user</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div className="mb-4">
              <label htmlFor="isActive" className="flex items-center text-sm font-medium text-gray-700">
                <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="ml-2">Is Active</span>
              </label>
            </div>
        </div>
      </form>
    </ResizableSidebar>
  );
}