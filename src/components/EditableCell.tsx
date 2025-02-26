// src/components/EditableCell.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Check } from 'lucide-react';

interface EditableCellProps {
  value: string | number | null;
  onChange: (value: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'date';
  field: string;
  orderId: string;
  orderNumber: string;
}

export default function EditableCell({
  value,
  onChange,
  type = 'text',
  field
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: session, status } = useSession();

  // Function to check if user has edit permission for the field
  const canEdit = () => {
    if (status === 'loading') return false;
    if (!session?.user?.role) return false;
    
    switch (session.user.role) {
      case 'PLANNER':
      case 'BEHEERDER':
        return true;
      case 'SALES':
        // List of fields that sales can edit
        const salesEditableFields = ['project', 'lever_datum', 'opmerking', 'inkoopordernummer'];
        return salesEditableFields.includes(field);
      default:
        return false;
    }
  };

  useEffect(() => {
    if (type === 'date' && value) {
      const dateValue = new Date(value as string);
      if (!isNaN(dateValue.getTime())) {
        setInputValue(dateValue.toISOString().split('T')[0]);
      } else {
        setInputValue('');
      }
    } else {
      setInputValue(value?.toString() || '');
    }
  }, [value, type]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!canEdit()) return;
    setIsEditing(true);
    setError(null);
  };

  const handleSubmit = async () => {
    if (inputValue === value?.toString()) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (type === 'date' && inputValue) {
        const date = new Date(inputValue);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }
      }

      let processedValue: string | number = inputValue;
      if (type === 'number') {
        const num = Number(inputValue);
        if (isNaN(num)) {
          throw new Error('Invalid number format');
        }
        processedValue = num;
      }

      // Call onChange - this already creates notifications on the server side
      await onChange(processedValue);
      
      // Show success indicator briefly
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlur = () => {
    handleSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(value?.toString() || '');
      setError(null);
    }
  };

  const formatDisplayValue = () => {
    if (!value) return '-';
    if (type === 'date') {
      const date = new Date(value as string);
      return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
    }
    return value;
  };

  // If session is still loading, display a simplified non-editable view
  if (status === 'loading') {
    return (
      <div className="px-2 py-1 text-gray-500">
        {formatDisplayValue()}
      </div>
    );
  }

  if (!canEdit()) {
    return (
      <div className="px-2 py-1 text-gray-500">
        {formatDisplayValue()}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          className={`
            w-full px-2 py-1 border rounded
            ${error ? 'border-red-500' : 'border-blue-500'}
            focus:outline-none focus:ring-1
            ${error ? 'focus:ring-red-500' : 'focus:ring-blue-500'}
            disabled:bg-gray-100 disabled:cursor-not-allowed
          `}
        />
        {error && (
          <div className="absolute top-full left-0 z-10 mt-1 px-2 py-1 text-xs text-white bg-red-500 rounded shadow">
            {error}
          </div>
        )}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`
        px-2 py-1 cursor-pointer rounded relative
        hover:bg-gray-50
        ${canEdit() ? 'hover:shadow-sm' : ''}
        ${showSuccess ? 'bg-green-50' : ''}
      `}
    >
      {formatDisplayValue()}
      {showSuccess && (
        <span className="absolute top-0 right-0 text-green-500">
          <Check className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}