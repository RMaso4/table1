// components/DraggableColumnHeader.tsx
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, X, GripVertical } from 'lucide-react';
import { Role } from '@prisma/client';
import RoleIndicator from '@/components/Roleindicator';

interface DraggableColumnHeaderProps {
  title: string;
  field: string;
  onSearch: (value: string) => void;
  sortDirection: 'asc' | 'desc' | null;
  onSort: () => void;
  onDragStart: (e: React.DragEvent, field: string) => void;
  onDragOver: (e: React.DragEvent, field: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  editableBy?: Role[]; // New prop to indicate which roles can edit this column
}

export default function DraggableColumnHeader({
  title,
  field,
  onSearch,
  sortDirection,
  onSort,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  editableBy = [] // Default to empty array if not provided
}: DraggableColumnHeaderProps) {
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
    <th
      className={`px-6 py-3 bg-gray-50 cursor-move ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, field)}
      onDragOver={(e) => onDragOver(e, field)}
      onDragEnd={onDragEnd}
      style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1">
                {title}
              </span>
              {editableBy && editableBy.length > 0 && (
                <div className="flex items-center mt-1">
                  <RoleIndicator roles={editableBy} size="sm" />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sortDirection !== undefined && (
              <button
                onClick={onSort}
                className="transition-opacity"
              >
                {sortDirection === 'asc' ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : sortDirection === 'desc' ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 opacity-50" />
                )}
              </button>
            )}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="transition-opacity"
            >
              <Search className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {isSearchOpen && (
          <div ref={searchRef} className="relative flex items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`Search ${title.toLowerCase()}...`}
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-2 text-gray-400 hover:text-gray-600"
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