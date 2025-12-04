'use client';

import { useState, useEffect, useCallback } from 'react';
import { createOrUpdateUser } from './actions';
import { UploadCloud } from 'lucide-react';
import { Role, User } from '@prisma/client';
import { uploadAvatar } from './uploadActions';
import Cropper, { type Point, type Area } from 'react-easy-crop';
import { getCroppedImg } from './cropImage';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { MultiSelectDropdown, MultiSelectOption } from '@/components/ui/MultiSelectDropdown';
import ResizableSidebar from '@/components/ui/ResizableSidebar';

type UserWithRoles = User & { userRoles: { roleId: number }[] };

interface UserFormProps {
  user: UserWithRoles | null;
  roles: Role[];
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  routePath: string;
}

export default function UserForm({ user, roles, isOpen, onClose, canCreate, canUpdate }: UserFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    avatarUrl: '',
    dateOfBirth: '',
    gender: '',
    isActive: true,
  });
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrcForCrop, setImageSrcForCrop] = useState('');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '', // Password is not sent to the client
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        isActive: user.isActive,
      });
      setSelectedRoles(user.userRoles.map(ur => ur.roleId));
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        avatarUrl: '',
        dateOfBirth: '',
        gender: '',
        isActive: true,
      });
      setSelectedRoles([]);
    }
  }, [user, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      toast.error('File is too big! Please select a file smaller than 200KB.');
      e.target.value = ''; // Reset file input
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrcForCrop(reader.result?.toString() || '');
      setCropModalOpen(true);
    });
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset file input to allow re-selection of the same file
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndUpload = async () => {
    if (!croppedAreaPixels || !imageSrcForCrop) return;
    setIsUploading(true);
    setCropModalOpen(false);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrcForCrop, croppedAreaPixels);
      const formData = new FormData();
      formData.append('file', croppedImageBlob, 'avatar.png');
      formData.append('oldAvatarUrl', formData.avatarUrl);
      const { url } = await uploadAvatar(formData);
      toast.success('Avatar uploaded successfully!');
      setFormData(prev => ({ ...prev, avatarUrl: url }));
    } catch (error) {
      console.error('Failed to upload cropped avatar:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Failed to upload avatar: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setZoom(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createOrUpdateUser({
      id: user?.id,
      ...formData,
      roleIds: selectedRoles,
      routePath,
    });

    if (result.error) {
      toast.error('Operation Failed', { description: result.error });
    } else {
      const successMessage = user ? 'User updated successfully!' : 'User created successfully!';
      toast.success(successMessage);
      onClose();
    }
  };

  if (!isOpen) return null;

  const roleOptions: MultiSelectOption[] = roles.map(r => ({
    value: r.id.toString(),
    label: r.name,
  }));

  const canSubmit = user ? canUpdate : canCreate;

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'Create New User'}
      initialWidth={520}
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" form="user-form" disabled={!canSubmit} className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
            {user ? 'Update User' : 'Create User'}
          </button>
        </div>
      }
    >
        <form id="user-form" onSubmit={handleSubmit} className="flex-grow flex flex-col pt-6 overflow-y-auto overflow-x-hidden px-3">
          <div className="flex-grow pr-4 -mr-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
            <div className="mb-6 flex items-center gap-4">
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                  <X size={32} />
                </div>
              )}
              <div>
                <label htmlFor="avatar-upload" className="block text-center text-sm font-medium text-gray-700 mb-1">
                  Profile Picture
                </label>
                <div className="flex items-center space-x-2 mt-2">
                  <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarFileSelect} className="hidden" disabled={isUploading} />
                  <button
                    type="button"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    className="flex-1 inline-flex justify-center items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    disabled={isUploading}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                  {formData.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, avatarUrl: '' }))}
                      className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-sm text-red-600 border border-gray-300 rounded-md shadow-sm font-medium bg-white hover:text-red-800"
                    >Remove</button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <div className="mb-4">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
              </div>
              <div className="mb-4">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" required />
            </div>
            <div className="mb-4">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
              <input type="text" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" name="password" id="password" value={formData.password} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder={user ? 'Leave blank to keep current' : ''} required={!user} />
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <div className="mb-4">
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input type="date" name="dateOfBirth" id="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="mb-4">
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                <select name="gender" id="gender" value={formData.gender} onChange={handleInputChange as any} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="mb-6 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700">Roles</label>
              <MultiSelectDropdown
                className="mt-2"
                options={roleOptions}
                value={selectedRoles.map(String)}
                onChange={(newValues) => setSelectedRoles(newValues.map(Number))}
                placeholder="Select roles..."
              />
            </div>

            <div className="flex items-center justify-between pt-4 pb-4 border-t border-gray-200">
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active Status</label>
              <button type="button" onClick={() => setFormData(p => ({ ...p, isActive: !p.isActive }))} className={`${formData.isActive ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full`}>
                <span className={`${formData.isActive ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`} />
              </button>
            </div>
          </div>

          {cropModalOpen && (
            <div className="fixed inset-0 bg-gray-900/70 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-lg font-medium">Crop your new picture</h3>
                <div className="relative h-80 w-full bg-gray-200 my-4">
                  <Cropper
                    image={imageSrcForCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    cropShape="round"
                    showGrid={false}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <label htmlFor="zoom-slider" className="text-sm">Zoom</label>
                  <input
                    id="zoom-slider"
                    type="range"
                    min={1} max={3} step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={() => { setCropModalOpen(false); setZoom(1); }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >Cancel</button>
                  <button
                    type="button"
                    onClick={handleCropAndUpload}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                  >Crop & Upload</button>
                </div>
              </div>
            </div>
          )}

        </form>
    </ResizableSidebar>
  );
}