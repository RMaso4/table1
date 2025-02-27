// src/components/ThemeSwitcher.tsx (new component)
'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun, Monitor } from 'lucide-react';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // When mounted on client, now we can show the UI
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="flex items-center space-x-2">
      <button
        className={`p-2 rounded-full ${theme === 'light' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        onClick={() => setTheme('light')}
        title="Light Mode"
      >
        <Sun className="h-5 w-5" />
      </button>
      
      <button
        className={`p-2 rounded-full ${theme === 'dark' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        onClick={() => setTheme('dark')}
        title="Dark Mode"
      >
        <Moon className="h-5 w-5" />
      </button>
      
      <button
        className={`p-2 rounded-full ${theme === 'system' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        onClick={() => setTheme('system')}
        title="System Theme"
      >
        <Monitor className="h-5 w-5" />
      </button>
    </div>
  );
}