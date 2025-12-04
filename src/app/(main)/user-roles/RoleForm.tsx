'use client';

import { useState, useEffect } from 'react';
import { createOrUpdateRole } from './actions';
import { toast } from 'sonner';
import ResizableSidebar from '@/components/ui/ResizableSidebar';
import { MultiSelectDropdown, MultiSelectOption } from '@/components/ui/MultiSelectDropdown';
import { Role, Permission } from '@prisma/client';

type RoleWithPermissions = Role & { rolePermissions: { permissionId: number }[] };

interface RoleFormProps {
  role: RoleWithPermissions | null;
  allPermissions: Permission[];
  isOpen: boolean;
  onClose: () => void;
}

const initialFormData = {
  name: '',
  description: '',
};

export default function RoleForm({ role, allPermissions, isOpen, onClose }: RoleFormProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [permissionIds, setPermissionIds] = useState<string[]>([]);

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || '',
      });
      setPermissionIds(role.rolePermissions.map(p => p.permissionId.toString()));
    } else {
      setFormData(initialFormData);
      setPermissionIds([]);
    }
  }, [role, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const promise = createOrUpdateRole({
      id: role?.id,
      name: formData.name,
      description: formData.description,
      permissionIds: permissionIds.map(id => parseInt(id, 10)),
    });

    toast.promise(promise, {
      loading: role ? 'Updating role...' : 'Creating role...',
      success: () => {
        onClose();
        return role ? 'Role updated successfully.' : 'Role created successfully.';
      },
      error: (err) => `Error: ${err.message}`,
    });
  };

  const permissionOptions: MultiSelectOption[] = allPermissions.map(p => ({
    value: p.id.toString(),
    label: p.name,
  }));

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={role ? 'Edit Role' : 'Create New Role'}
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" form="role-form" className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">{role ? 'Update Role' : 'Create Role'}</button>
        </div>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden pt-6">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Role Name</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="permissions" className="block text-sm font-medium text-gray-700">Permissions</label>
            <MultiSelectDropdown options={permissionOptions} value={permissionIds} onChange={setPermissionIds} placeholder="Select permissions" searchPlaceholder="Search permissions..." />
          </div>
        </div>
      </form>
    </ResizableSidebar>
  );
}