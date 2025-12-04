'use client';

import { useState, useEffect } from 'react';
import { createOrUpdateRole } from './actions';
import { Role, Permission } from '@prisma/client';
import { MultiSelectDropdown, MultiSelectOption } from '@/components/ui/MultiSelectDropdown';
import ResizableSidebar from '@/components/ui/ResizableSidebar';

interface RoleFormProps {
  role: Role & { rolePermissions: { permission: Permission }[] } | null;
  permissions: Permission[];
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  routePath: string;
}

export default function RoleForm({ role, permissions, isOpen, onClose, canCreate, canUpdate, routePath }: RoleFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
      setSelectedPermissions(role.rolePermissions.map(rp => rp.permission.id));
    } else {
      setName('');
      setDescription('');
      setSelectedPermissions([]);
    }
    setError(null);
  }, [role, isOpen]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createOrUpdateRole({
        id: role?.id,
        name,
        description,
        permissionIds: selectedPermissions,
        routePath,
      });
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  const canSubmit = role ? canUpdate : canCreate;

  const permissionOptions: MultiSelectOption[] = permissions.map(p => ({
    value: p.id.toString(),
    label: p.name,
  }));

  if (!isOpen) return null;

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={role ? 'Edit Role' : 'Create New Role'}
      initialWidth={480}
      footer={
        <div className="flex justify-end space-x-3 pt-4 border-t mt-auto border-gray-200">
          <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
            Cancel
          </button>
          <button type="submit" form="role-form" disabled={!canSubmit} className="bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed">
            {role ? 'Update Role' : 'Create Role'}
          </button>
        </div>
      }
    >
        <form id="role-form" onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-y-auto overflow-x-hidden pt-6">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Role Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full px-4 py-2 rounded-lg border-gray-200 bg-gray-50 text-gray-900 shadow-sm transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>
          <div className="mb-6 flex-grow">
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <MultiSelectDropdown
              options={permissionOptions}
              value={selectedPermissions.map(String)}
              onChange={(newValues) => setSelectedPermissions(newValues.map(Number))}
              placeholder="Select permissions..."
            />
          </div>
          {error && (
            <div className="my-2 text-sm text-red-600">
              <strong>Error:</strong> {error}
            </div>
          )}
        </form>
    </ResizableSidebar>
  );
}