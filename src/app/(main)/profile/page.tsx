// app/dashboard/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  User, 
  Mail, 
  MapPin, 
  Globe, 
  Calendar,
  Edit3,
  Save,
  Camera,
  Bell,
  Shield,
  HardDrive,
  BarChart3,
  Download,
  Upload,
  Folder,
  FolderPlus,
  Trash2,
  LogOut
} from 'lucide-react';

import type { UserProfile } from '@/types/userProfile';
import { DateUtils } from '@/lib/utils/dateUtils';
// Mock user data - replace with actual API calls
const mockUser: UserProfile = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: '/assets/images/avata/avata.jpg',
  bio: 'Photography enthusiast and travel blogger. Love capturing moments from around the world.',
  location: 'Lisbon, Portugal',
  website: 'https://johndoe-photography.com',
  joinedAt: '2024-01-15',
  lastLogin: '2024-12-19',
  storageUsed: 2.3, // GB
  storageLimit: 10, // GB
  imageCount: 245,
  folderCount: 12
};

const mockPreferences = {
  theme: 'dark' as const,
  language: 'en',
  notifications: {
    email: true,
    push: false,
    monthlyReports: true
  },
  privacy: {
    profileVisible: true,
    galleryPublic: false,
    allowDownloads: true
  }
};

export default function UserProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'activity'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(mockUser);
  const [preferences, setPreferences] = useState(mockPreferences);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    bio: user.bio,
    location: user.location,
    website: user.website
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const handleSaveProfile = () => {
    setUser(prev => ({
      ...prev,
      ...formData
    }));
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setFormData({
      name: user.name,
      email: user.email,
      bio: user.bio,
      location: user.location,
      website: user.website
    });
    setIsEditing(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle avatar upload - in real app, upload to server
      const reader = new FileReader();
      reader.onload = (e) => {
        setUser(prev => ({
          ...prev,
          avatar: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const storagePercentage = (user.storageUsed / user.storageLimit) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold relative overflow-hidden">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera className="w-4 h-4 text-gray-600" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
                <p className="text-gray-500 text-sm mt-1">{user.email}</p>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Profile</span>
                </button>

                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'preferences'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-medium">Preferences</span>
                </button>

                <button
                  onClick={() => setActiveTab('activity')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'activity'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Activity</span>
                </button>
              </nav>

              {/* Storage Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Storage</span>
                  <span className="text-sm text-gray-500">
                    {user.storageUsed.toFixed(1)} GB / {user.storageLimit} GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${storagePercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {storagePercentage.toFixed(1)}% used
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <ProfileTab
                user={user}
                isEditing={isEditing}
                formData={formData}
                setFormData={setFormData}
                onEdit={() => setIsEditing(true)}
                onSave={handleSaveProfile}
                onCancel={handleCancelEdit}
              />
            )}

            {activeTab === 'preferences' && (
              <PreferencesTab
                preferences={preferences}
                setPreferences={setPreferences}
              />
            )}

            {activeTab === 'activity' && (
              <ActivityTab userId={user.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Tab Component
function ProfileTab({ 
  user, 
  isEditing, 
  formData, 
  setFormData, 
  onEdit, 
  onSave, 
  onCancel 
}: any) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
        {!isEditing ? (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{user.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="flex items-center gap-2 text-gray-900">
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your location"
              />
            ) : (
              <div className="flex items-center gap-2 text-gray-900">
                <MapPin className="w-4 h-4" />
                {user.location || 'Not specified'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            {isEditing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-gray-900">{user.bio || 'No bio provided'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            {isEditing ? (
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            ) : (
              <div className="flex items-center gap-2 text-gray-900">
                <Globe className="w-4 h-4" />
                {user.website ? (
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {user.website}
                  </a>
                ) : (
                  'Not specified'
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{user.imageCount}</div>
              <div className="text-sm text-gray-500">Images</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{user.folderCount}</div>
              <div className="text-sm text-gray-500">Folders</div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Member since:</span>
            <span className="text-gray-900">{DateUtils.formatDate(user.joinedAt, true)}</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Last login:</span>
            <span className="text-gray-900">{DateUtils.formatDate(user.lastLogin, true)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Preferences Tab Component
function PreferencesTab({ preferences, setPreferences }: any) {
  const updateNotification = (key: string, value: boolean) => {
    setPreferences((prev: any) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const updatePrivacy = (key: string, value: boolean) => {
    setPreferences((prev: any) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Preferences</h2>

      <div className="space-y-8">
        {/* Theme Preferences */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['light', 'dark', 'system'].map((theme) => (
              <button
                key={theme}
                onClick={() => setPreferences({ ...preferences, theme })}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  preferences.theme === theme
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900 capitalize">{theme}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {theme === 'system' ? 'Follow system setting' : `${theme} mode`}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
          <div className="space-y-4">
            {Object.entries(preferences.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {key === 'email' && 'Receive email notifications'}
                    {key === 'push' && 'Browser push notifications'}
                    {key === 'monthlyReports' && 'Monthly gallery reports'}
                  </div>
                </div>
                <button
                  onClick={() => updateNotification(key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy</h3>
          <div className="space-y-4">
            {Object.entries(preferences.privacy).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {key === 'profileVisible' && 'Make your profile visible to others'}
                    {key === 'galleryPublic' && 'Allow public access to your gallery'}
                    {key === 'allowDownloads' && 'Allow image downloads'}
                  </div>
                </div>
                <button
                  onClick={() => updatePrivacy(key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-700">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Export Data</div>
                  <div className="text-sm">Download all your images and data</div>
                </div>
              </div>
            </button>

            <button className="w-full flex items-center justify-between p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-700">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Delete Account</div>
                  <div className="text-sm">Permanently delete your account and all data</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity Tab Component
function ActivityTab({ userId }: { userId: string }) {
  // Mock activity data
  const activities = [
    {
      id: '1',
      action: 'upload',
      description: 'Uploaded 5 images to "Vacation Photos"',
      timestamp: '2024-12-19T10:30:00Z',
      ipAddress: '192.168.1.1'
    },
    {
      id: '2',
      action: 'create_folder',
      description: 'Created new folder "Landscape Photography"',
      timestamp: '2024-12-18T15:45:00Z',
      ipAddress: '192.168.1.1'
    },
    {
      id: '3',
      action: 'delete',
      description: 'Deleted image "IMG_1234.jpg"',
      timestamp: '2024-12-17T09:20:00Z',
      ipAddress: '192.168.1.1'
    },
    {
      id: '4',
      action: 'update_profile',
      description: 'Updated profile information',
      timestamp: '2024-12-16T14:10:00Z',
      ipAddress: '192.168.1.1'
    }
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload': return <Upload className="w-4 h-4" />;
      case 'create_folder': return <Folder className="w-4 h-4" />;
      case 'delete': return <Trash2 className="w-4 h-4" />;
      case 'update_profile': return <User className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'upload': return 'text-green-600 bg-green-50';
      case 'create_folder': return 'text-blue-600 bg-blue-50';
      case 'delete': return 'text-red-600 bg-red-50';
      case 'update_profile': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
            <div className={`p-2 rounded-full ${getActionColor(activity.action)}`}>
              {getActionIcon(activity.action)}
            </div>
            <div className="flex-1">
              <p className="text-gray-900">{activity.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>{new Date(activity.timestamp).toLocaleString()}</span>
                {activity.ipAddress && (
                  <>
                    <span>•</span>
                    <span>IP: {activity.ipAddress}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No activity yet</p>
          <p className="text-sm mt-1">Your activity will appear here</p>
        </div>
      )}
    </div>
  );
}