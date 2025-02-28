// src/utils/settingsUtils.ts
/**
 * Utility functions for applying user settings across the application
 */

// Define settings types
export interface UserSettings {
    theme: 'light' | 'dark' | 'system';
    language: string;
    tableCompactMode: boolean;
    defaultPageSize: number;
    showNotifications: boolean;
    defaultSortColumn: string;
    defaultSortDirection: 'asc' | 'desc';
    defaultColumns: string[];
    dateFormat: string;
    timeFormat: '12h' | '24h';
  }
  
  export interface AdminSettings {
    defaultRole: string;
    requireApprovalForChanges: boolean;
    trackOrderHistory: boolean;
    autoCloseNotifications: boolean;
    notificationRetentionDays: number;
    allowCustomPages: boolean;
    maxPriorityOrders: number;
    auditLogEnabled: boolean;
    autoBackup: boolean;
  }
  
  export interface AllSettings {
    user: UserSettings;
    admin: AdminSettings;
  }
  
  // Default settings
  export const defaultSettings: AllSettings = {
    user: {
      theme: 'light',
      language: 'en',
      tableCompactMode: false,
      defaultPageSize: 50,
      showNotifications: true,
      defaultSortColumn: 'lever_datum',
      defaultSortDirection: 'asc',
      defaultColumns: ['verkoop_order', 'project', 'debiteur_klant', 'material', 'lever_datum'],
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '24h'
    },
    admin: {
      defaultRole: 'GENERAL_ACCESS',
      requireApprovalForChanges: false,
      trackOrderHistory: true,
      autoCloseNotifications: true,
      notificationRetentionDays: 30,
      allowCustomPages: true,
      maxPriorityOrders: 20,
      auditLogEnabled: true,
      autoBackup: true
    }
  };
  
  /**
   * Format a date according to user date format preference
   */
  export function formatDate(date: Date | string | null | undefined, userSettings?: UserSettings): string {
    if (!date) return '-';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return '-';
      }
      
      const settings = userSettings || loadUserSettings()?.user || defaultSettings.user;
      
      // Determine which format to use
      const dateFormat = settings.dateFormat || 'MM/DD/YYYY';
      
      // Format based on preference
      switch (dateFormat) {
        case 'MM/DD/YYYY':
          return `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
        case 'DD/MM/YYYY':
          return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
        case 'YYYY-MM-DD':
          return `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
        default:
          return dateObj.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  }
  
  /**
   * Format a time according to user time format preference
   */
  export function formatTime(date: Date | string | null | undefined, userSettings?: UserSettings): string {
    if (!date) return '-';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return '-';
      }
      
      const settings = userSettings || loadUserSettings()?.user || defaultSettings.user;
      
      // Determine which format to use
      const timeFormat = settings.timeFormat || '24h';
      
      // Format based on preference
      if (timeFormat === '12h') {
        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      } else {
        return `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return '-';
    }
  }
  
  /**
   * Format a date and time according to user preferences
   */
  export function formatDateTime(date: Date | string | null | undefined, userSettings?: UserSettings): string {
    if (!date) return '-';
    
    const dateStr = formatDate(date, userSettings);
    const timeStr = formatTime(date, userSettings);
    
    return `${dateStr} ${timeStr}`;
  }
  
  /**
   * Load user settings from localStorage (client-side only)
   */
  export function loadUserSettings(): AllSettings | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const storedSettings = localStorage.getItem('userSettings');
    if (!storedSettings) {
      return null;
    }
    
    try {
      const parsedSettings = JSON.parse(storedSettings) as Partial<AllSettings>;
      
      // Merge with defaults to ensure all properties
      return {
        user: { ...defaultSettings.user, ...parsedSettings.user },
        admin: { ...defaultSettings.admin, ...parsedSettings.admin }
      };
    } catch (error) {
      console.error('Error parsing stored settings:', error);
      return null;
    }
  }
  
  /**
   * Apply the appropriate table classes based on user compact mode preference
   */
  export function getTableClasses(userSettings?: UserSettings): string {
    const settings = userSettings || loadUserSettings()?.user || defaultSettings.user;
    
    return settings.tableCompactMode 
      ? 'min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs' 
      : 'min-w-full divide-y divide-gray-200 dark:divide-gray-700';
  }
  
  /**
   * Apply the appropriate table cell padding based on user compact mode preference
   */
  export function getTableCellClasses(userSettings?: UserSettings): string {
    const settings = userSettings || loadUserSettings()?.user || defaultSettings.user;
    
    return settings.tableCompactMode 
      ? 'px-3 py-2 whitespace-nowrap' 
      : 'px-6 py-4 whitespace-nowrap';
  }
  
  /**
   * Get the default page size from user settings
   */
  export function getDefaultPageSize(userSettings?: UserSettings): number {
    const settings = userSettings || loadUserSettings()?.user || defaultSettings.user;
    return settings.defaultPageSize || 50;
  }
  
  /**
   * Get the default sort settings for tables
   */
  export function getDefaultSort(userSettings?: UserSettings): { field: string; direction: 'asc' | 'desc' } {
    const settings = userSettings || loadUserSettings()?.user || defaultSettings.user;
    
    return {
      field: settings.defaultSortColumn || 'lever_datum',
      direction: settings.defaultSortDirection || 'asc'
    };
  }
  
  /**
   * Check if notifications should be shown based on user preferences
   */
  export function shouldShowNotifications(userSettings?: UserSettings): boolean {
    const settings = userSettings || loadUserSettings()?.user || defaultSettings.user;
    return settings.showNotifications !== false; // Default to true if not set
  }
  
  /**
   * Get max priority orders setting
   */
  export function getMaxPriorityOrders(adminSettings?: AdminSettings): number {
    const settings = adminSettings || loadUserSettings()?.admin || defaultSettings.admin;
    return settings.maxPriorityOrders || 20;
  }
  
  /**
   * Check if custom pages are allowed based on admin settings
   */
  export function areCustomPagesAllowed(adminSettings?: AdminSettings): boolean {
    const settings = adminSettings || loadUserSettings()?.admin || defaultSettings.admin;
    return settings.allowCustomPages !== false; // Default to true if not set
  }
  
  /**
   * Get notification retention days
   */
  export function getNotificationRetentionDays(adminSettings?: AdminSettings): number {
    const settings = adminSettings || loadUserSettings()?.admin || defaultSettings.admin;
    return settings.notificationRetentionDays || 30;
  }