'use client';

import { useState, useEffect } from 'react';
import { createOrUpdatePermission } from './actions'; 
import { Plus, Trash2 } from 'lucide-react';
import { Permission } from '@prisma/client';
import ResizableSidebar from '@/components/ui/ResizableSidebar';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';

interface PermissionFormProps {
  permission: Permission | null;
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  menuNames: { value: string, label: string }[];
  routePath: string;
}

interface PermissionRow {
  id: number;
  name: string;
  type: string;
  description: string;
}

export default function PermissionForm({ permission, isOpen, onClose, canCreate, canUpdate, menuNames, routePath }: PermissionFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([]);
  const [baseName, setBaseName] = useState('');

  useEffect(() => {
    if (permission) {
      setName(permission.name);
      setDescription(permission.description || '');
    } else {
      setName('');
      setDescription('');
    }

    if (!permission && isOpen) {
      setBaseName('');
      setPermissionRows([
        { id: 1, name: '', type: 'view', description: 'View Permission' },
        { id: 2, name: '', type: 'create', description: 'Create Permission' },
        { id: 3, name: '', type: 'update', description: 'Update Permission' },
        { id: 4, name: '', type: 'delete', description: 'Delete Permission' },
      ]);
    }
  }, [permission, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (permission) { // Update mode
      await createOrUpdatePermission({ id: permission.id, name, description, routePath });
    } else { // Create mode
      const permissionsToCreate = permissionRows
        .filter(row => row.name.trim() !== '' && row.type.trim() !== '')
        .map(row => ({
          name: row.name,
          description: row.description,
          type: row.type,
        }));

      if (permissionsToCreate.length > 0) {
        await createOrUpdatePermission({ permissions: permissionsToCreate, routePath });
      }
    }
    onClose(); 
  };

  const handleAddRow = () => {
    setPermissionRows(prev => [...prev, { id: Date.now(), name: baseName, type: '', description: '' }]);
  };

  const handleRemoveRow = (id: number) => {
    setPermissionRows(prev => prev.filter(row => row.id !== id));
  };

  const handleRowChange = (id: number, field: keyof PermissionRow, value: string) => {
    setPermissionRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  if (!isOpen) return null;

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={permission ? 'Edit Permission' : 'Create New Permission'}
      initialWidth={permission ? 420 : 500}
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200 sticky bottom-0 bg-white py-6">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" form="permission-form" disabled={!(permission ? canUpdate : canCreate)} className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
            {permission ? 'Update Permission' : 'Create Permission'}
          </button>
        </div>
      }
    >
        <form id="permission-form" onSubmit={handleSubmit} className="flex-grow flex flex-col pt-6 overflow-y-auto px-4">
          {permission ? ( // Edit form
            <>
              <div className="mb-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Permission Name</label>
                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-2 block w-full px-4 py-3 rounded-lg border-gray-200 bg-gray-50 text-gray-900 shadow-sm transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white" required />
              </div>
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-2 block w-full px-4 py-3 rounded-lg border-gray-200 bg-gray-50 text-gray-900 shadow-sm transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white" />
              </div>
            </>
          ) : ( // Create form
            <div className="flex-grow">
              <div className="mb-4">
                <label htmlFor="baseName" className="block text-sm font-medium text-gray-700">Base Permission Name</label>
                <AutocompleteDropdown
                  options={menuNames}
                  value={baseName}
                  onChange={(value) => {
                    const newBaseName = value || '';
                    setBaseName(newBaseName);
                    setPermissionRows(rows => rows.map(row => ({ ...row, name: newBaseName })));
                  }}
                  placeholder="Select a base name from menus..."
                  searchPlaceholder="Search menus..."
                  emptyText="No matching menu found."
                  className="mt-2"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="pb-2 pl-2 text-left text-sm font-medium text-gray-700">Type</th>
                      <th className="pb-2 pl-2 text-left text-sm font-medium text-gray-700">Description</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissionRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-2 pb-2">
                          <input type="text" placeholder="Type" value={row.type} onChange={e => handleRowChange(row.id, 'type', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
                        </td>
                        <td className="px-2 pb-2">
                          <input type="text" placeholder="Description" value={row.description} onChange={e => handleRowChange(row.id, 'description', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
                        </td>
                        <td className="pl-2 pb-2">
                          <button type="button" onClick={() => handleRemoveRow(row.id)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="mt-3 flex items-center text-sm text-indigo-600 hover:text-indigo-800"
              >
                <Plus size={16} className="mr-1" /> Add Row
              </button>
            </div>
          )}
        </form>
    </ResizableSidebar>
  );
}