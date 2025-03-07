// src/components/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);

    // Try to get theme from localStorage
    const storedTheme = localStorage.getItem('theme') as Theme | null;

    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      // If no stored theme, try to get from user settings in cookies
      try {
        const settingsStr = localStorage.getItem('userSettings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          if (settings?.user?.theme) {
            setTheme(settings.user.theme);
          }
        }
      } catch (error) {
        console.error('Error loading theme from settings:', error);
      }
    }
  }, []);

  // Update theme when it changes
  useEffect(() => {
    if (!mounted) return;

    // Save theme to localStorage for persistence
    localStorage.setItem('theme', theme);

    // Apply theme to document
    const root = window.document.documentElement;

    // Clear existing theme classes
    root.classList.remove('light', 'dark');

    // Apply appropriate theme
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, mounted]);

  // Add listener for system theme changes
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}