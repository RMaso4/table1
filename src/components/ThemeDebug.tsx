// src/components/ThemeDebug.tsx
'use client';

import { useTheme } from './ThemeProvider';
import { useState, useEffect } from 'react';

export default function ThemeDebug() {
  const { theme } = useTheme();
  const [htmlClass, setHtmlClass] = useState<string>('');
  const [systemPreference, setSystemPreference] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get HTML element class
    setHtmlClass(document.documentElement.classList.toString());
    
    // Get system preference
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setSystemPreference(isDarkMode ? 'dark' : 'light');
    
    // Update when system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Update HTML class when theme changes
  useEffect(() => {
    if (mounted) {
      setHtmlClass(document.documentElement.classList.toString());
    }
  }, [theme, mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-3 rounded shadow-lg text-sm border border-gray-200 dark:border-gray-700 z-50">
      <p>Theme setting: <span className="font-bold">{theme}</span></p>
      <p>HTML class: <span className="font-bold">{htmlClass}</span></p>
      <p>System preference: <span className="font-bold">{systemPreference}</span></p>
    </div>
  );
}