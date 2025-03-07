// src/components/ThemeToggle.tsx
'use client';

import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // When mounted on client, now we can show the UI
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // Return different buttons based on the active theme
  return (
    <div className="flex gap-1">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-full ${
          theme === 'light' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' 
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
        title="Light mode"
      >
        <Sun className="h-5 w-5" />
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-full ${
          theme === 'dark' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' 
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
        title="Dark mode"
      >
        <Moon className="h-5 w-5" />
      </button>
      
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-full ${
          theme === 'system' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' 
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
        title="System preference"
      >
        <Laptop className="h-5 w-5" />
      </button>
    </div>
  );
}