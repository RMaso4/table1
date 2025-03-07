// src/components/SearchBar.tsx
'use client';

import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  value?: string;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  value = '',
  placeholder = "Search orders..."
}: SearchBarProps) {
  return (
    <div className="relative w-96">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onSearch(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 sm:text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}