'use client';

import { useState, useEffect } from 'react';
import { createOrUpdateMenu } from './actions';
import { toast } from 'sonner';
import ResizableSidebar from '@/components/ui/ResizableSidebar';
import { Menu as MenuType } from '@prisma/client';

interface MenuFormProps {
  menu: MenuType | null;
  allMenus: MenuType[];
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  routePath: string;
}

const initialFormData = {
  name: '',
  description: '',
  href: '',
  icon: '',
  order: '0',
  parentId: '',
};

export default function MenuForm({ menu, allMenus, isOpen, onClose, canCreate, canUpdate, routePath }: MenuFormProps) {
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (menu) {
      setFormData({
        name: menu.name,
        description: menu.description || '',
        href: menu.href || '',
        icon: menu.icon || '',
        order: menu.order.toString(),
        parentId: menu.parentId?.toString() || '',
      });
    } else {
      setFormData(initialFormData);
    }
  }, [menu, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createOrUpdateMenu({
      id: menu?.id,
      name: formData.name,
      description: formData.description,
      href: formData.href,
      icon: formData.icon,
      order: parseInt(formData.order, 10) || 0,
      parentId: formData.parentId ? parseInt(formData.parentId, 10) : null,
      routePath,
    });

    if ('error' in result && result.error) {
      toast.error('Operation Failed', { description: result.error });
    } else {
      const successMessage = menu ? 'Menu updated successfully.' : 'Menu created successfully.';
      toast.success(successMessage);
      onClose();
    }
  };

  if (!isOpen) return null;

  const canSubmit = menu ? canUpdate : canCreate;

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={menu ? 'Edit Menu' : 'Create New Menu'}
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" form="menu-form" disabled={!canSubmit} className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">{menu ? 'Update Menu' : 'Create Menu'}</button>
        </div>
      }
    >
      <form id="menu-form" onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden pt-6">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
          </div>
          <div className="mb-4">
            <label htmlFor="href" className="block text-sm font-medium text-gray-700">Path (href)</label>
            <input type="text" name="href" id="href" value={formData.href} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="/example/path" />
          </div>
          <div className="mb-4">
            <label htmlFor="icon" className="block text-sm font-medium text-gray-700">Icon Name</label>
            <input type="text" name="icon" id="icon" value={formData.icon} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., Home, Users" />
          </div>
          <div className="mb-4">
            <label htmlFor="order" className="block text-sm font-medium text-gray-700">Order</label>
            <input type="number" name="order" id="order" value={formData.order} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
          <div className="mb-4">
            <label htmlFor="parentId" className="block text-sm font-medium text-gray-700">Parent Menu</label>
            <select name="parentId" id="parentId" value={formData.parentId} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="">None (Top-level)</option>
              {allMenus.filter(m => m.id !== menu?.id).map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
        </div>
      </form>
    </ResizableSidebar>
  );
}