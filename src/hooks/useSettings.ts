// src/hooks/useSettings.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  defaultSettings, 
  type AllSettings, 
  type UserSettings, 
  type AdminSettings 
} from '@/utils/settingsUtils';

export interface UseSettingsReturn {
  settings: AllSettings;
  userSettings: UserSettings;
  adminSettings: AdminSettings;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  updateUserSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  updateAdminSetting: <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => void;
  saveSettings: () => Promise<boolean>;
  resetToDefaults: () => void;
  hasChanges: boolean;
}

export default function useSettings(): UseSettingsReturn {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<AllSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<AllSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Determine if user is admin
  const isAdmin = session?.user?.role === 'BEHEERDER';

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      // Don't fetch if session is loading or user isn't logged in
      if (status === 'loading' || status === 'unauthenticated') {
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // First try to load from API
        const response = await fetch('/api/settings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch settings from server');
        }
        
        const data = await response.json();
        setSettings(data);
        setOriginalSettings(data);
        
        // Also save to localStorage for offline use
        localStorage.setItem('userSettings', JSON.stringify(data));
      } catch (error) {
        console.error('Error loading settings:', error);
        
        // Try to load from localStorage
        const storedSettings = localStorage.getItem('userSettings');
        if (storedSettings) {
          try {
            const parsedSettings = JSON.parse(storedSettings);
            // Merge with defaults to ensure we have all properties
            const merged = {
              user: { ...defaultSettings.user, ...parsedSettings.user },
              admin: { ...defaultSettings.admin, ...parsedSettings.admin }
            };
            setSettings(merged);
            setOriginalSettings(merged);
          } catch (_parseError) {
            setError('Failed to load settings');
            // Fall back to default settings
            setSettings(defaultSettings);
            setOriginalSettings(defaultSettings);
          }
        } else {
          // No stored settings, use defaults
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

  // Update individual settings
  const updateUserSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      user: {
        ...prev.user,
        [key]: value
      }
    }));
  }, []);

  const updateAdminSetting = useCallback(<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
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
  }, [isAdmin]);

  // Save settings to server and localStorage
  const saveSettings = useCallback(async (): Promise<boolean> => {
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

      // Also save to localStorage for offline use
      localStorage.setItem('userSettings', JSON.stringify(settings));

      if (!response.ok) {
        // Try to get error details from response
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save settings to server');
      }

      // Update original settings to match current
      setOriginalSettings(settings);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(error instanceof Error ? error.message : 'Settings saved locally but could not be saved to the server');
      return false;
    }
  }, [settings, isAdmin, hasChanges]);

  // Reset to default settings
  const resetToDefaults = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return {
    settings,
    userSettings: settings.user,
    adminSettings: settings.admin,
    isAdmin,
    isLoading,
    error,
    updateUserSetting,
    updateAdminSetting,
    saveSettings,
    resetToDefaults,
    hasChanges
  };
}