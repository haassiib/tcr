'use client';

import { useState, useEffect } from 'react';
import { assignRolesToUser } from './actions';
import { User, Role, UserRole } from '@prisma/client';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown';
import { toast } from 'sonner';
import ResizableSidebar from '@/components/ui/ResizableSidebar';

type UserRoleWithAllRoles = UserRole & { allRoleIds: string[] };

interface AssignRoleFormProps {
  users: User[];
  roles: Role[];
  assignment: UserRoleWithAllRoles | null;
  isOpen: boolean;
  onClose: () => void;
  canAssign: boolean;
  routePath: string;
}

export default function AssignRoleForm({ users, roles, assignment, isOpen, onClose, canAssign, routePath }: AssignRoleFormProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (assignment) {
      setUserId(String(assignment.userId));
      setRoleIds(assignment.allRoleIds);
    } else {
      // Reset form for new assignment
      setUserId(null);
      setRoleIds([]);
    }
  }, [assignment, isOpen]);

  const handleClose = () => {
    setUserId(null);
    setRoleIds([]);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || roleIds.length === 0) {
      toast.error('Please select both a user and a role.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await assignRolesToUser({
        userId: parseInt(userId),
        roleIds: roleIds.map(id => parseInt(id)),
        routePath,
      });
      if ('error' in result && result.error) {
        toast.error('Operation Failed', { description: result.error });
      } else {
        toast.success('Roles assigned successfully!');
        handleClose();
      }
    } catch (error) {
      toast.error('An unexpected error occurred while assigning roles.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const userOptions = users.map(u => ({ value: u.id.toString(), label: `${u.firstName} ${u.lastName} (${u.email})` }));
  const roleOptions = roles.map(r => ({ value: r.id.toString(), label: r.name }));

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={handleClose}
      title={assignment ? 'Edit User Roles' : 'Assign Role to User'}
      initialWidth={520}
      footer={
        <div className="flex justify-end space-x-3 mt-auto pt-6 border-t border-gray-200">
          <button type="button" onClick={handleClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" form="assign-role-form" disabled={isSubmitting || !canAssign} className="bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400">
            {isSubmitting ? 'Assigning...' : (assignment ? 'Update Roles' : 'Assign Role')}
          </button>
        </div>
      }
    >
        <form id="assign-role-form" onSubmit={handleSubmit} className="flex-grow flex flex-col pt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
            <AutocompleteDropdown options={userOptions} value={userId} onChange={setUserId} placeholder="Select a user" searchPlaceholder="Search user..." emptyText="No users found." disabled={!!assignment} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <MultiSelectDropdown options={roleOptions} value={roleIds} onChange={setRoleIds} placeholder="Select roles" />
          </div>
        </form>
    </ResizableSidebar>
  );
}