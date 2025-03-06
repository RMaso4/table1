// src/components/EditableCell.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Check, ChevronUp, ChevronDown } from 'lucide-react';
import { canRoleEditColumn } from '@/utils/columnPermissions';
import { Role } from '@prisma/client';

interface EditableCellProps {
  value: string | number | boolean | null;
  onChange: (value: string | number | boolean) => Promise<void>;
  type?: 'text' | 'number' | 'date';
  field: string;
  orderId: string;
  orderNumber: string;
}

export default function EditableCell({
  value,
  onChange,
  type = 'text',
  field,
  orderId: _orderId,
  orderNumber: _orderNumber
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: session, status } = useSession();

  // Format the initial value when the component mounts or value changes
  useEffect(() => {
    if (type === 'date' && value) {
      try {
        const dateValue = new Date(value as string);
        if (!isNaN(dateValue.getTime())) {
          setInputValue(dateValue.toISOString().split('T')[0]);
        } else {
          setInputValue('');
        }
      } catch (_error) {
        setInputValue('');
      }
    } else {
      setInputValue(value?.toString() || '');
    }
  }, [value, type]);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Memoize the validation function to prevent recreation on each render
  const validateInput = useCallback((): boolean => {
    // Reset error first
    setError(null);

    try {
      // Validate based on field type
      if (type === 'number' && inputValue !== '') {
        const num = Number(inputValue);
        if (isNaN(num)) {
          setError('Please enter a valid number');
          return false;
        }
      }

      if (type === 'date' && inputValue !== '') {
        const date = new Date(inputValue);
        if (isNaN(date.getTime())) {
          setError('Please enter a valid date');
          return false;
        }
      }

      return true;
    } catch (_err) {
      setError('Invalid input');
      return false;
    }
  }, [inputValue, type]);

  // Check if user has edit permission for the field
  const canEdit = useCallback(() => {
    if (status === 'loading') return false;
    if (!session?.user?.role) return false;

    // Use the utility function to check if the user's role can edit this field
    return canRoleEditColumn(session.user.role as Role, field);
  }, [status, session, field]);

  const handleDoubleClick = useCallback(() => {
    if (!canEdit()) return;
    setIsEditing(true);
    setError(null);
  }, [canEdit]);

  const handleSubmit = useCallback(async () => {
    if (inputValue === value?.toString()) {
      setIsEditing(false);
      return;
    }

    // Validate input
    if (!validateInput()) {
      return; // Don't submit if validation fails
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let processedValue: string | number | boolean = inputValue;

      // Process based on type
      if (type === 'number' && inputValue) {
        processedValue = Number(inputValue);
      } else if (type === 'date' && inputValue) {
        // Date already validated in validateInput
        processedValue = inputValue;
      } else if (type === 'date' && !inputValue) {
        // Empty date field should be null
        processedValue = null as unknown as string;
      }

      // Call onChange - this already creates notifications on the server side
      await onChange(processedValue);

      // Show success indicator briefly
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      setIsEditing(false);
    } catch (err) {
      // Error is already handled in the onChange function (in DashboardContent)
      // Just keep the cell in edit mode
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [inputValue, value, validateInput, onChange, type]);

  const handleBlur = useCallback(() => {
    // Only submit if we're not already submitting and there's no error
    if (!isSubmitting && !error) {
      handleSubmit();
    }
  }, [isSubmitting, error, handleSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(value?.toString() || '');
      setError(null);
    }
  }, [handleSubmit, value]);

  const formatDisplayValue = useCallback(() => {
    if (value === null || value === undefined || value === '') return '-';

    if (type === 'date') {
      try {
        const date = new Date(value as string);
        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
      } catch (_error) {
        return '-';
      }
    }

    return value;
  }, [value, type]);

  // Function to increment number value
  const incrementValue = () => {
    if (type !== 'number') return;
    const currentValue = Number(inputValue) || 0;
    setInputValue((currentValue + 1).toString());
  };

  // Function to decrement number value
  const decrementValue = () => {
    if (type !== 'number') return;
    const currentValue = Number(inputValue) || 0;
    setInputValue((currentValue - 1).toString());
  };

  // If session is still loading, display a simplified non-editable view
  if (status === 'loading') {
    return (
      <div className="px-2 py-1 text-gray-500 dark:text-gray-400">
        {formatDisplayValue()}
      </div>
    );
  }

  if (!canEdit()) {
    return (
      <div className="px-2 py-1 text-gray-500 dark:text-gray-400">
        {formatDisplayValue()}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="relative">
        {type === 'number' ? (
          <div className="number-input-container">
            <input
              ref={inputRef}
              type="text" // Using text instead of number to have better control
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              className={`
                w-full px-2 py-1 border rounded pr-7
                ${error ? 'border-red-500 dark:border-red-500' : 'border-blue-500 dark:border-blue-500'}
                focus:outline-none focus:ring-1
                ${error ? 'focus:ring-red-500 dark:focus:ring-red-500' : 'focus:ring-blue-500 dark:focus:ring-blue-500'}
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed
              `}
            />
            <div className="number-input-arrows">
              <div className="number-arrow" onClick={incrementValue}>
                <ChevronUp className="h-3 w-3" />
              </div>
              <div className="number-arrow" onClick={decrementValue}>
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>
        ) : (
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
              ${error ? 'border-red-500 dark:border-red-500' : 'border-blue-500 dark:border-blue-500'}
              focus:outline-none focus:ring-1
              ${error ? 'focus:ring-red-500 dark:focus:ring-red-500' : 'focus:ring-blue-500 dark:focus:ring-blue-500'}
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
              disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed
            `}
          />
        )}
        {error && (
          <div className="absolute top-full left-0 z-10 mt-1 px-2 py-1 text-xs text-white bg-red-500 rounded shadow">
            {error}
          </div>
        )}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white dark:bg-gray-700 bg-opacity-50 dark:bg-opacity-50 flex items-center justify-center">
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
        hover:bg-gray-50 dark:hover:bg-gray-700
        ${canEdit() ? 'hover:shadow-sm' : ''}
        ${showSuccess ? 'bg-green-50 dark:bg-green-900/30' : ''}
        text-gray-900 dark:text-gray-100
      `}
    >
      {formatDisplayValue()}
      {showSuccess && (
        <span className="absolute top-0 right-0 text-green-500 dark:text-green-400">
          <Check className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}