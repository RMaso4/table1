import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface FilterPopupProps {
  title: string;
  options: string[];
  selectedValues: Set<string>;
  onApplyFilter: (selected: Set<string>) => void;
  onClose: () => void;
}

export default function FilterPopup({
  title,
  options,
  selectedValues,
  onApplyFilter,
  onClose
}: FilterPopupProps) {
  const [selected, setSelected] = useState<Set<string>>(selectedValues);
  const [searchTerm, setSearchTerm] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside popup to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    String(option).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selected.size === options.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(options));
    }
  };

  const handleToggleOption = (option: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(option)) {
      newSelected.delete(option);
    } else {
      newSelected.add(option);
    }
    setSelected(newSelected);
  };

  const handleApply = () => {
    onApplyFilter(selected);
    onClose();
  };

  return (
    <div
      ref={popupRef}
      className="absolute z-50 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200"
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          type="text"
          placeholder="Search options..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="mb-3">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {selected.size === options.length ? 'Unselect All' : 'Select All'}
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <label
              key={index}
              className="flex items-center py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(option)}
                onChange={() => handleToggleOption(option)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                {String(option)}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}