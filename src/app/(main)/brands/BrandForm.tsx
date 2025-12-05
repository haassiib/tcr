'use client';

import { useState, useEffect } from 'react';
import { createOrUpdateBrand } from './actions';
import ResizableSidebar from '@/components/ui/ResizableSidebar';
import { Brand } from '@prisma/client';
import { toast } from 'sonner';

interface BrandFormProps {
  brand: Brand | null;
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  routePath: string;
}

export default function BrandForm({ brand, isOpen, onClose, canCreate, canUpdate, routePath }: BrandFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: false,
  });

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
        description: brand.description || '',
        isActive: brand.isActive,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        isActive: false,
      });
    }
  }, [brand, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createOrUpdateBrand({
      id: brand?.id,
      name: formData.name,
      description: formData.description,
      isActive: formData.isActive,
      routePath,
    });

    if ('error' in result &&  result.error) {
      toast.error('Operation Failed', { description: result.error });
    } else {
      const successMessage = brand ? 'Brand updated successfully.' : 'New brand created.';
      toast.success(successMessage);
      onClose();
    }
  };

  if (!isOpen) return null;

  const canSubmit = brand ? canUpdate : canCreate;

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={brand ? 'Edit Brand' : 'Create New Brand'}
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" form="brand-form" disabled={!canSubmit} className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">{brand ? 'Update Brand' : 'Create Brand'}</button>
        </div>
      }
    >
      <form id="brand-form" onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden pt-6">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
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