// src/app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import TableSettingsSection from '@/components/TableSettingsSection';
import { useTheme } from '@/components/ThemeProvider';
import {
  Save,
  User,
  Shield,
  Monitor,
  Sun,
  Moon,
  Check,
  Info,
  X,
  AlertTriangle,
} from 'lucide-react';

// Define types for settings
interface UserSettings {
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

// Removed SystemSettings interface

interface AdminSettings {
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

interface AllSettings {
  user: UserSettings;
  admin: AdminSettings;
}

const defaultSettings: AllSettings = {
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

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('user');
  const [settings, setSettings] = useState<AllSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<AllSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { setTheme } = useTheme();

  // Check if user is authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First try to load from API
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          setOriginalSettings(data);
          setLoading(false);
          return;
        }

        // Fallback to localStorage
        const storedSettings = localStorage.getItem('userSettings');
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          // Merge with defaults to ensure we have all properties
          const merged = {
            user: { ...defaultSettings.user, ...parsedSettings.user },
            admin: { ...defaultSettings.admin, ...parsedSettings.admin }
          };
          setSettings(merged);
          setOriginalSettings(merged);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        // Keep default settings
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      loadSettings();
    }
  }, [session]);

  // Check for changes
  useEffect(() => {
    if (loading) return;

    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(settingsChanged);
  }, [settings, originalSettings, loading]);

  // Handle user role-based access
  const isAdmin = session?.user?.role === 'BEHEERDER';

  // Update settings handlers
  const updateUserSettings = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      user: {
        ...prev.user,
        [key]: value
      }
    }));
  };

  const updateAdminSettings = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      admin: {
        ...prev.admin,
        [key]: value
      }
    }));
  };

  // Handle saving settings
  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Build settings object based on user's role
      const settingsToSave: Partial<AllSettings> = {
        user: settings.user
      };

      // Only include admin settings if user is BEHEERDER
      if (session?.user?.role === 'BEHEERDER') {
        settingsToSave.admin = settings.admin;
      }

      // Try to save to API - only send what user has permission to modify
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
      });

      // Also save to localStorage as fallback
      localStorage.setItem('userSettings', JSON.stringify(settings));

      if (!response.ok) {
        // Try to get error details from response
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save settings to server');
      }

      // Update original settings to match current
      setOriginalSettings(settings);
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(error instanceof Error ? error.message : 'Settings saved locally but could not be saved to the server');
    } finally {
      setSaving(false);
    }
  };

  // Reset settings
  const resetSettings = () => {
    setSettings(originalSettings);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings(defaultSettings);
    }
  };

  // Apply theme when settings change
  useEffect(() => {
    if (settings?.user?.theme) {
      setTheme(settings.user.theme);
    }
  }, [settings?.user?.theme, setTheme]);

  if (loading || status === 'loading') {
    return (
      <div className="flex h-screen">
        <Navbar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Navbar />
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
        <div className="p-8 flex-grow overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your application preferences and configurations</p>
          </div>

          {/* Success and Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 p-4 rounded flex justify-between items-center">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                <p className="text-green-700 dark:text-green-400">Settings saved successfully</p>
              </div>
              <button onClick={() => setSuccess(false)}>
                <X className="h-5 w-5 text-green-700 dark:text-green-400" />
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 p-4 rounded flex justify-between items-center">
              <div className="flex items-center">
                <Info className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" />
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
              <button onClick={() => setError(null)}>
                <X className="h-5 w-5 text-red-700 dark:text-red-400" />
              </button>
            </div>
          )}

          {/* Role-based Access Banner */}
          {!isAdmin && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 p-4 rounded flex items-center">
              <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
              <p className="text-blue-700 dark:text-blue-400">
                Some admin settings can only be modified by users with BEHEERDER role.
              </p>
            </div>
          )}

          {/* Settings Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('user')}
                  className={`px-6 py-4 text-sm font-medium flex items-center ${activeTab === 'user'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <User className="h-5 w-5 mr-2" />
                  User Preferences
                </button>

                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-6 py-4 text-sm font-medium flex items-center ${activeTab === 'admin'
                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    <Shield className="h-5 w-5 mr-2" />
                    Admin Settings
                  </button>
                )}
              </nav>
            </div>

            {/* Settings Forms */}
            <div className="p-6">
              {/* User Preferences */}
              {activeTab === 'user' && (
                <div className="space-y-8">
                  <h2 className="text-lg font-medium border-b border-gray-200 dark:border-gray-700 pb-2">Display Settings</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Theme Setting */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Theme
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setTheme('light');
                            updateUserSettings('theme', 'light');
                          }}
                          className={`px-3 py-2 rounded-md flex items-center gap-2 ${settings.user.theme === 'light'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          <Sun className="h-4 w-4" />
                          <span>Light</span>
                        </button>

                        <button
                          onClick={() => {
                            setTheme('dark');
                            updateUserSettings('theme', 'dark');
                          }}
                          className={`px-3 py-2 rounded-md flex items-center gap-2 ${settings.user.theme === 'dark'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          <Moon className="h-4 w-4" />
                          <span>Dark</span>
                        </button>

                        <button
                          onClick={() => {
                            setTheme('system');
                            updateUserSettings('theme', 'system');
                          }}
                          className={`px-3 py-2 rounded-md flex items-center gap-2 ${settings.user.theme === 'system'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          <Monitor className="h-4 w-4" />
                          <span>System</span>
                        </button>
                      </div>
                    </div>

                    {/* Language Setting */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Language
                      </label>
                      <select
                        value={settings.user.language}
                        onChange={(e) => updateUserSettings('language', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="en">English</option>
                        <option value="nl">Dutch</option>
                        <option value="de">German</option>
                        <option value="fr">French</option>
                      </select>
                    </div>

                    {/* Date Format */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date Format
                      </label>
                      <select
                        value={settings.user.dateFormat}
                        onChange={(e) => updateUserSettings('dateFormat', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    {/* Time Format */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Time Format
                      </label>
                      <select
                        value={settings.user.timeFormat}
                        onChange={(e) => updateUserSettings('timeFormat', e.target.value as '12h' | '24h')}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="12h">12-hour (AM/PM)</option>
                        <option value="24h">24-hour</option>
                      </select>
                    </div>
                  </div>

                  {/* Table Settings */}
                  <TableSettingsSection
                    settings={settings.user}
                    updateUserSetting={updateUserSettings}
                  />

                  {/* Default Page Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Page Size
                    </label>
                    <select
                      value={settings.user.defaultPageSize}
                      onChange={(e) => updateUserSettings('defaultPageSize', parseInt(e.target.value))}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="10">10 rows</option>
                      <option value="25">25 rows</option>
                      <option value="50">50 rows</option>
                      <option value="100">100 rows</option>
                      <option value="250">250 rows</option>
                    </select>
                  </div>

                  {/* Default Sort Column */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Sort Column
                    </label>
                    <select
                      value={settings.user.defaultSortColumn}
                      onChange={(e) => updateUserSettings('defaultSortColumn', e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="verkoop_order">Order #</option>
                      <option value="project">Project</option>
                      <option value="debiteur_klant">Customer</option>
                      <option value="aanmaak_datum">Creation Date</option>
                      <option value="lever_datum">Delivery Date</option>
                      <option value="updatedAt">Last Updated</option>
                    </select>
                  </div>

                  {/* Default Sort Direction */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Sort Direction
                    </label>
                    <select
                      value={settings.user.defaultSortDirection}
                      onChange={(e) => updateUserSettings('defaultSortDirection', e.target.value as 'asc' | 'desc')}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>

                  {/* Notification Settings */}
                  <h2 className="text-lg font-medium border-b border-gray-200 dark:border-gray-700 pb-2 pt-4">Notification Settings</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Show Notifications */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Show In-App Notifications
                      </label>
                      <button
                        type="button"
                        onClick={() => updateUserSettings('showNotifications', !settings.user.showNotifications)}
                        className={`${settings.user.showNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                      >
                        <span
                          aria-hidden="true"
                          className={`${settings.user.showNotifications ? 'translate-x-5' : 'translate-x-0'
                            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Settings */}
              {activeTab === 'admin' && isAdmin && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium border-b border-gray-200 dark:border-gray-700 pb-2">User Management</h2>
                    <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                      <Shield className="h-3 w-3 mr-1" />
                      BEHEERDER access only
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Default Role */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Default New User Role
                      </label>
                      <select
                        value={settings.admin.defaultRole}
                        onChange={(e) => updateAdminSettings('defaultRole', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="GENERAL_ACCESS">General Access</option>
                        <option value="SCANNER">Scanner</option>
                        <option value="SALES">Sales</option>
                        <option value="PLANNER">Planner</option>
                        <option value="BEHEERDER">Beheerder (Admin)</option>
                      </select>
                    </div>

                    {/* Approval for Changes */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Require Approval for Changes
                      </label>
                      <button
                        type="button"
                        onClick={() => updateAdminSettings('requireApprovalForChanges', !settings.admin.requireApprovalForChanges)}
                        className={`${settings.admin.requireApprovalForChanges ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                      >
                        <span
                          aria-hidden="true"
                          className={`${settings.admin.requireApprovalForChanges ? 'translate-x-5' : 'translate-x-0'
                            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium border-b border-gray-200 dark:border-gray-700 pb-2 pt-4">Order Configuration</h2>
                    <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                      <Shield className="h-3 w-3 mr-1" />
                      BEHEERDER access only
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Track Order History */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Track Order Change History
                      </label>
                      <button
                        type="button"
                        onClick={() => updateAdminSettings('trackOrderHistory', !settings.admin.trackOrderHistory)}
                        className={`${settings.admin.trackOrderHistory ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                      >
                        <span
                          aria-hidden="true"
                          className={`${settings.admin.trackOrderHistory ? 'translate-x-5' : 'translate-x-0'
                            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>

                    {/* Max Priority Orders */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Maximum Priority Orders
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={settings.admin.maxPriorityOrders}
                        onChange={(e) => updateAdminSettings('maxPriorityOrders', parseInt(e.target.value))}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    {/* Allow Custom Pages */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Allow Custom Pages
                      </label>
                      <button
                        type="button"
                        onClick={() => updateAdminSettings('allowCustomPages', !settings.admin.allowCustomPages)}
                        className={`${settings.admin.allowCustomPages ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                      >
                        <span
                          aria-hidden="true"
                          className={`${settings.admin.allowCustomPages ? 'translate-x-5' : 'translate-x-0'
                            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium border-b border-gray-200 dark:border-gray-700 pb-2 pt-4">System Maintenance</h2>
                    <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                      <Shield className="h-3 w-3 mr-1" />
                      BEHEERDER access only
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Audit Log */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Enable Audit Logging
                      </label>
                      <button
                        type="button"
                        onClick={() => updateAdminSettings('auditLogEnabled', !settings.admin.auditLogEnabled)}
                        className={`${settings.admin.auditLogEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                      >
                        <span
                          aria-hidden="true"
                          className={`${settings.admin.auditLogEnabled ? 'translate-x-5' : 'translate-x-0'
                            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>

                    {/* Auto Backup */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Auto Backup Database
                      </label>
                      <button
                        type="button"
                        onClick={() => updateAdminSettings('autoBackup', !settings.admin.autoBackup)}
                        className={`${settings.admin.autoBackup ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                      >
                        <span
                          aria-hidden="true"
                          className={`${settings.admin.autoBackup ? 'translate-x-5' : 'translate-x-0'
                            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>

                    {/* Auto Close Notifications */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Auto-Close Notifications
                      </label>
                      <button
                        type="button"
                        onClick={() => updateAdminSettings('autoCloseNotifications', !settings.admin.autoCloseNotifications)}
                        className={`${settings.admin.autoCloseNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                      >
                        <span
                          aria-hidden="true"
                          className={`${settings.admin.autoCloseNotifications ? 'translate-x-5' : 'translate-x-0'
                            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>

                    {/* Notification Retention */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notification Retention (days)
                      </label>
                      <select
                        value={settings.admin.notificationRetentionDays}
                        onChange={(e) => updateAdminSettings('notificationRetentionDays', parseInt(e.target.value))}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <div>
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Reset to Defaults
                </button>

                {hasChanges && (
                  <button
                    type="button"
                    onClick={resetSettings}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Discard Changes
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {!isAdmin && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" />
                    Some settings require administrator privileges
                  </div>
                )}
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={!hasChanges || saving}
                  className={`
                    inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                    ${hasChanges
                      ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800'
                      : 'bg-blue-300 dark:bg-blue-800/50 cursor-not-allowed'
                    }
                  `}
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}