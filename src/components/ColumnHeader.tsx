// components/ColumnHeader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';

interface ColumnHeaderProps {
  title: string;
  onSearch: (value: string) => void;
  sortDirection: 'asc' | 'desc' | null;
  onSort: () => void;
}

export default function ColumnHeader({
  title,
  onSearch,
  sortDirection,
  onSort
}: ColumnHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between group">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            {title}
          </span>
          <div className="flex items-center gap-2">
            {sortDirection !== undefined && (
              <button
                onClick={onSort}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {sortDirection === 'asc' ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                ) : sortDirection === 'desc' ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500 opacity-50" />
                )}
              </button>
            )}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </button>
          </div>
        </div>

        {isSearchOpen && (
          <div ref={searchRef} className="relative flex items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder={`Search ${title.toLowerCase()}...`}
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </th>
  );
}