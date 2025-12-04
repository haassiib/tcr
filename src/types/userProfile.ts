// types/user.ts
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedAt: string;
  lastLogin: string;
  storageUsed: number;
  storageLimit: number;
  imageCount: number;
  folderCount: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    monthlyReports: boolean;
  };
  privacy: {
    profileVisible: boolean;
    galleryPublic: boolean;
    allowDownloads: boolean;
  };
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
}