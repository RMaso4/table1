// src/utils/excelExportUtils.ts
import { Order } from '@/types';

export interface ColumnDefinition {
  field: string;
  title: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

/**
 * Converts an array of orders to Excel-compatible CSV format
 * with proper text delimiters and encoding to ensure single-column display is avoided
 */
export const convertToExcelCSV = (data: Order[], columns: ColumnDefinition[]): string => {
  // Create header row with proper Excel CSV formatting
  // Excel needs a specific BOM marker at the start of the file
  const BOM = '\uFEFF';

  // Use semi-colon delimiter which works better with Excel
  const delimiter = ';';

  // Create header row
  const headers = columns.map(col => `"${col.title}"`).join(delimiter);

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
        // Escape quotes in strings and ensure Excel treats as text
        // Excel needs double quotes escaped as double-double quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }
    }).join(delimiter);
  }).join('\n');

  // Combine BOM, headers and rows
  return `${BOM}${headers}\n${rows}`;
};

/**
 * Alternative function that creates an Excel-specific TSV format
 * This format works better with Excel's default import behavior
 */
export const convertToExcelTSV = (data: Order[], columns: ColumnDefinition[]): string => {
  // Excel works well with tab-delimited files
  const delimiter = '\t';

  // Create header row
  const headers = columns.map(col => col.title).join(delimiter);

  // Create data rows
  const rows = data.map(order => {
    return columns.map(column => {
      const value = order[column.field as keyof Order];

      // Format the value based on its type
      if (value === null || value === undefined) {
        return '';
      } else if (column.type === 'date' && value) {
        try {
          const date = new Date(value as string);
          return date.toLocaleDateString();
        } catch {
          return String(value);
        }
      } else if (column.type === 'boolean') {
        return value ? 'Yes' : 'No';
      } else {
        // For TSV, we don't need to escape quotes, just tabs
        return String(value).replace(/\t/g, ' ');
      }
    }).join(delimiter);
  }).join('\n');

  // Combine headers and rows
  return `${headers}\n${rows}`;
};

/**
 * Exports data to a CSV file with Excel compatibility and triggers download
 */
export const exportToExcel = (
  data: Order[],
  columns: ColumnDefinition[],
  filename = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`,
  format: 'csv' | 'tsv' = 'csv'
) => {
  // Choose the appropriate format
  const fileContent = format === 'csv'
    ? convertToExcelCSV(data, columns)
    : convertToExcelTSV(data, columns);

  // Change file extension based on format
  const extension = format === 'csv' ? '.csv' : '.tsv';
  const filenameWithExt = filename.endsWith(extension) ? filename : filename.replace(/\.\w+$/, '') + extension;

  // Set the appropriate MIME type
  const mimeType = format === 'csv'
    ? 'text/csv;charset=utf-8;'
    : 'text/tab-separated-values;charset=utf-8;';

  // Create a Blob containing the data
  const blob = new Blob([fileContent], { type: mimeType });

  // Create a download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // Set up the link
  link.setAttribute('href', url);
  link.setAttribute('download', filenameWithExt);
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
 * Creates a multi-format export menu with Excel compatibility
 */
export const createExcelExportOptions = (
  data: Order[],
  columns: ColumnDefinition[],
  onSuccess?: () => void,
  onError?: (error: Error) => void
) => {
  return {
    toExcel: () => {
      try {
        exportToExcel(data, columns, undefined, 'csv');
        onSuccess?.();
        return true;
      } catch (error) {
        console.error('Export error:', error);
        onError?.(error instanceof Error ? error : new Error('Export failed'));
        return false;
      }
    },
    toTSV: () => {
      try {
        exportToExcel(data, columns, `orders-export-${new Date().toISOString().slice(0, 10)}.tsv`, 'tsv');
        onSuccess?.();
        return true;
      } catch (error) {
        console.error('Export error:', error);
        onError?.(error instanceof Error ? error : new Error('Export failed'));
        return false;
      }
    }
  };
};