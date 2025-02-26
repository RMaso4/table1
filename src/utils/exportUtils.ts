// src/utils/exportUtils.ts
import { Order } from '@/types';

export interface ColumnDefinition {
  field: string;
  title: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

/**
 * Converts an array of orders to CSV format
 */
export const convertToCSV = (data: Order[], columns: ColumnDefinition[]): string => {
  // Create header row
  const headers = columns.map(col => `"${col.title}"`).join(',');
  
  // Create data rows
  const rows = data.map(order => {
    return columns.map(column => {
      const value = order[column.field as keyof Order];
      
      // Format the value based on its type
      if (value === null || value === undefined) {
        return '""';
      } else if (column.type === 'date' && value) {
        try {
          const date = new Date(value as string);
          return `"${date.toLocaleDateString()}"`;
        } catch {
          return `"${value}"`;
        }
      } else if (column.type === 'boolean') {
        return value ? '"Yes"' : '"No"';
      } else {
        // Escape quotes in strings
        return `"${String(value).replace(/"/g, '""')}"`;
      }
    }).join(',');
  }).join('\n');
  
  // Combine headers and rows
  return `${headers}\n${rows}`;
};

/**
 * Exports data to a CSV file and triggers download
 */
export const exportToCSV = (
  data: Order[], 
  columns: ColumnDefinition[], 
  filename = `orders-export-${new Date().toISOString().slice(0,10)}.csv`
) => {
  // Convert data to CSV
  const csv = convertToCSV(data, columns);
  
  // Create a Blob containing the CSV data
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Set up the link
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add to document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
  
  return true;
};

/**
 * Creates a multi-format export menu
 * This is a placeholder for future expansion to support Excel exports
 */
export const createExportOptions = (
  data: Order[], 
  columns: ColumnDefinition[], 
  onSuccess?: () => void,
  onError?: (error: Error) => void
) => {
  return {
    toCSV: () => {
      try {
        exportToCSV(data, columns);
        onSuccess?.();
        return true;
      } catch (error) {
        console.error('Export error:', error);
        onError?.(error instanceof Error ? error : new Error('Export failed'));
        return false;
      }
    },
    // Can be expanded later to support Excel exports
  };
};