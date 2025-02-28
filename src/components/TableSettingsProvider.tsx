// src/components/TableSettingsProvider.tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import useTableSettings from '@/hooks/useTableSettings';
import { SortState } from '@/types';

// Define the context type
interface TableSettingsContextType {
  compact: boolean;
  pageSize: number;
  defaultSort: SortState;
  isLoading: boolean;
  getTableClasses: () => string;
  getTableCellClasses: () => string;
}

// Create the context
const TableSettingsContext = createContext<TableSettingsContextType | undefined>(undefined);

// Provider component
export function TableSettingsProvider({ children }: { children: ReactNode }) {
  const settings = useTableSettings();

  // Utility functions for consistent class application
  const getTableClasses = () => {
    return settings.compact 
      ? 'min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs' 
      : 'min-w-full divide-y divide-gray-200 dark:divide-gray-700';
  };

  const getTableCellClasses = () => {
    return settings.compact 
      ? 'px-3 py-2 whitespace-nowrap' 
      : 'px-6 py-4 whitespace-nowrap';
  };

  const value: TableSettingsContextType = {
    ...settings,
    getTableClasses,
    getTableCellClasses
  };

  return (
    <TableSettingsContext.Provider value={value}>
      {children}
    </TableSettingsContext.Provider>
  );
}

// Hook for using table settings
export function useTableSettingsContext() {
  const context = useContext(TableSettingsContext);
  
  if (context === undefined) {
    throw new Error('useTableSettingsContext must be used within a TableSettingsProvider');
  }
  
  return context;
}