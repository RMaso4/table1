// components/FilterDialog.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Filter } from 'lucide-react';

interface FilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | boolean | null;
  value2?: string | number | null;
}

interface FilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterConfig[]) => void;
  availableColumns: {
    field: string;
    title: string;
    type: 'text' | 'number' | 'date' | 'boolean';
  }[];
}

export default function FilterDialog({
  isOpen,
  onClose,
  onApplyFilters,
  availableColumns
}: FilterDialogProps) {
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const getOperatorsByType = (type: string) => {
    switch (type) {
      case 'number':
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'greaterThan', label: 'Greater Than' },
          { value: 'lessThan', label: 'Less Than' },
          { value: 'between', label: 'Between' }
        ];
      case 'boolean':
        return [
          { value: 'equals', label: 'Equals' }
        ];
      default:
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' }
        ];
    }
  };

  const addFilter = () => {
    const newFilter: FilterConfig = {
      field: availableColumns[0].field,
      operator: 'equals',
      value: null
    };
    setFilters([...filters, newFilter]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<FilterConfig>) => {
    const newFilters = filters.map((filter, i) =>
      i === index ? { ...filter, ...updates } : filter
    );
    setFilters(newFilters);
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={dialogRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Filter Table</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            {filters.map((filter, index) => {
              const column = availableColumns.find(col => col.field === filter.field);
              return (
                <div key={index} className="flex items-start gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <select
                        value={filter.field}
                        onChange={(e) => updateFilter(index, { field: e.target.value })}
                        className="rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 p-2"
                      >
                        {availableColumns.map(col => (
                          <option key={col.field} value={col.field}>{col.title}</option>
                        ))}
                      </select>

                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(index, {
                          operator: e.target.value as FilterConfig['operator']
                        })}
                        className="rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 p-2"
                      >
                        {getOperatorsByType(column?.type || 'text').map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                        <input
                          type={column?.type === 'date' ? 'date' : 'text'}
                          value={filter.value?.toString() || ''}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          className="flex-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 p-2"
                          placeholder="Value"
                        />
                        {filter.operator === 'between' && (
                          <input
                            type={column?.type === 'date' ? 'date' : 'text'}
                            value={filter.value2 || ''}
                            onChange={(e) => updateFilter(index, { value2: e.target.value })}
                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 p-2"
                            placeholder="Value 2"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFilter(index)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={addFilter}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <Filter className="h-4 w-4" />
              Add Filter
            </button>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}