'use client';

import { Role, Permission } from '@prisma/client';
import { Shield, Users, FileText } from 'lucide-react';
import ResizableSidebar from '@/components/ui/ResizableSidebar';

type RoleWithRelations = Role & {
  rolePermissions: { permission: Permission }[];
  userRoles: any[];
};

interface RoleViewProps {
  role: RoleWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
  <div className="flex items-start py-4">
    <div className="text-gray-500 mr-4 mt-1">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <div className="text-md font-medium text-gray-800">{value || 'N/A'}</div>
    </div>
  </div>
);

export default function RoleView({ role, isOpen, onClose }: RoleViewProps) {
  if (!isOpen || !role) return null;

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title="Role Details"
      initialWidth={480}
    >
        <div className="flex-grow overflow-y-auto pt-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-indigo-600">{role.name}</h3>
          </div>

          <div className="divide-y divide-gray-200">
            <DetailItem
              icon={<FileText size={20} />}
              label="Description"
              value={<p className="text-gray-700">{role.description}</p>}
            />
            <DetailItem
              icon={<Users size={20} />}
              label="Users with this role"
              value={<span className="font-bold text-lg">{role.userRoles.length}</span>}
            />
            <DetailItem
              icon={<Shield size={20} />}
              label="Permissions"
              value={
                role.rolePermissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {role.rolePermissions.map(({ permission }) => (
                      <span key={permission.id} className="bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                        {permission.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No permissions assigned.</p>
                )
              }
            />
          </div>
        </div>
    </ResizableSidebar>
  );
}