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
    
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
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
    
    // First, remove BOTH theme classes to ensure a clean state
    root.classList.remove('light', 'dark');
    
    // Then apply the appropriate theme
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
    
    const handleChange = () => {
      // Get the current system preference
      const newSystemTheme = mediaQuery.matches ? 'dark' : 'light';
      
      // First, remove both classes to avoid conflicts
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      
      // Then add the correct one
      root.classList.add(newSystemTheme);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Initial setup
    handleChange();
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, mounted]);

  // To avoid hydration mismatch, only render children when mounted
  if (!mounted) {
    return <>{children}</>;
  }

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