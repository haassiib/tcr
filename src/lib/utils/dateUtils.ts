// utils/dateUtils.ts
export class DateUtils {
  static formatDate(dateString: string, isClient: boolean, options?: Intl.DateTimeFormatOptions) {
    if (!isClient) return 'Loading...';
    
    try {
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      return new Date(dateString).toLocaleDateString('en-US', { ...defaultOptions, ...options });
    } catch {
      return 'Invalid Date';
    }
  }

  static formatDateTime(dateString: string, isClient: boolean) {
    if (!isClient) return 'Loading...';
    
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  }

  static formatRelativeTime(dateString: string, isClient: boolean) {
    if (!isClient) return 'Loading...';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays}d ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
      
      return this.formatDate(dateString, isClient);
    } catch {
      return 'Invalid Date';
    }
  }

  static getCurrentDate(isClient: boolean, options?: Intl.DateTimeFormatOptions) {
    if (!isClient) return 'Loading...';
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return new Date().toLocaleDateString('en-US', { ...defaultOptions, ...options });
  }
}