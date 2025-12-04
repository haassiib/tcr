'use client';

import { Role, User } from '@prisma/client';
import { Mail, Phone, Calendar, User as UserIcon, Shield } from 'lucide-react';
import ResizableSidebar from '@/components/ui/ResizableSidebar';

type UserWithRelations = User & {
  userRoles: { role: Role }[];
};

interface UserViewProps {
  user: UserWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
  <div className="flex items-start py-3">
    <div className="text-gray-500 mr-4">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-md font-medium text-gray-800">{value || 'N/A'}</p>
    </div>
  </div>
);

export default function UserView({ user, isOpen, onClose }: UserViewProps) {
  if (!isOpen || !user) return null;

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      initialWidth={420}
    >
        <div className="flex-grow overflow-y-auto pt-6">
          <div className="flex flex-col items-center mb-6">
            <img
              src={user.avatarUrl || '/images/avatars/default.png'}
              alt={`${user.firstName} ${user.lastName}`}
              className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-gray-200"
            />
            <h3 className="text-xl font-bold">{`${user.firstName} ${user.lastName}`}</h3>
            <span className={`mt-2 px-3 py-1 text-xs font-semibold rounded-full ${
              user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="divide-y divide-gray-200">
            <DetailItem
              icon={<Mail size={20} />}
              label="Email"
              value={<a href={`mailto:${user.email}`} className="text-indigo-600 hover:underline">{user.email}</a>}
            />
            <DetailItem
              icon={<Phone size={20} />}
              label="Phone"
              value={user.phone}
            />
            <DetailItem
              icon={<Calendar size={20} />}
              label="Date of Birth"
              value={formatDate(user.dateOfBirth)}
            />
            <DetailItem
              icon={<UserIcon size={20} />}
              label="Gender"
              value={user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'N/A'}
            />
            <DetailItem
              icon={<Shield size={20} />}
              label="Roles"
              value={
                <div className="flex flex-wrap gap-2 mt-1">
                  {user.userRoles.map(ur => (
                    <span key={ur.role.id} className="bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                      {ur.role.name}
                    </span>
                  ))}
                </div>
              }
            />
          </div>
        </div>
    </ResizableSidebar>
  );
}