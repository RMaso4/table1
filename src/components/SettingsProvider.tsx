// src/components/SettingsProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { defaultSettings, AllSettings, UserSettings, AdminSettings } from '@/utils/settingsUtils';

// Create a settings context
interface SettingsContextType {
  settings: AllSettings;
  userSettings: UserSettings;
  adminSettings: AdminSettings;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  updateUserSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  updateAdminSetting: <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => void;
  saveSettings: () => Promise<boolean>;
  hasChanges: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<AllSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<AllSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Determine if user is admin
  const isAdmin = session?.user?.role === 'BEHEERDER';

  // Fetch settings when session is ready
  useEffect(() => {
    const fetchSettings = async () => {
      // Skip if session is still loading or not logged in
      if (status === 'loading' || status === 'unauthenticated') {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First try to load from API
        const response = await fetch('/api/settings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }

        const data = await response.json();
        setSettings(data);
        setOriginalSettings(data);

        // Save to localStorage for offline use
        localStorage.setItem('userSettings', JSON.stringify(data));
      } catch (error) {
        console.error('Error loading settings:', error);
        
        // Try to load from localStorage
        const storedSettings = localStorage.getItem('userSettings');
        if (storedSettings) {
          try {
            const parsedSettings = JSON.parse(storedSettings);
            // Merge with defaults to ensure all properties
            const merged = {
              user: { ...defaultSettings.user, ...parsedSettings.user },
              admin: { ...defaultSettings.admin, ...parsedSettings.admin }
            };
            setSettings(merged);
            setOriginalSettings(merged);
          } catch (parseError) {
            console.error('Error parsing stored settings:', parseError);
            // Fall back to defaults
            setSettings(defaultSettings);
            setOriginalSettings(defaultSettings);
          }
        } else {
          // No stored settings - use defaults
          setSettings(defaultSettings);
          setOriginalSettings(defaultSettings);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [status]);

  // Check for changes
  useEffect(() => {
    if (isLoading) return;
    
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(settingsChanged);
  }, [settings, originalSettings, isLoading]);

  // Update user settings
  const updateUserSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      user: {
        ...prev.user,
        [key]: value
      }
    }));
  };

  // Update admin settings
  const updateAdminSetting = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    if (!isAdmin) {
      console.warn('Only admin users can update admin settings');
      return;
    }

    setSettings(prev => ({
      ...prev,
      admin: {
        ...prev.admin,
        [key]: value
      }
    }));
  };

  // Save settings to API and localStorage
  const saveSettings = async (): Promise<boolean> => {
    if (!hasChanges) return true;

    setError(null);

    try {
      // Build settings object based on user's role
      const settingsToSave: Partial<AllSettings> = {
        user: settings.user
      };

      // Only include admin settings if user is BEHEERDER
      if (isAdmin) {
        settingsToSave.admin = settings.admin;
      }

      // Try to save to API
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
      });

      // Save to localStorage as fallback
      localStorage.setItem('userSettings', JSON.stringify(settings));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save settings');
      }

      // Update original settings to match current
      setOriginalSettings(settings);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(error instanceof Error ? error.message : 'Settings saved locally but could not be saved to the server');
      return false;
    }
  };

  // Provide context value
  const contextValue: SettingsContextType = {
    settings,
    userSettings: settings.user,
    adminSettings: settings.admin,
    isAdmin,
    isLoading,
    error,
    updateUserSetting,
    updateAdminSetting,
    saveSettings,
    hasChanges,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

// Hook for using settings
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  return context;
}