import React, { useState } from 'react';
import { Download, File, FileText, X } from 'lucide-react';
import { Order } from '@/types';

// Import our custom export functions
// Note: In a real app, you would update these imports to match your project structure
// import { exportToExcel, ColumnDefinition } from '@/utils/excelExportUtils';

// Define the ColumnDefinition type
interface ColumnDefinition {
  field: string;
  title: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

// Helper function for CSV export (included in component for demonstration)
const convertToExcelCSV = (data: Order[], columns: ColumnDefinition[]): string => {
  // Excel needs a BOM marker at the start of the file
  const BOM = '\uFEFF';

  // Use semicolons as delimiters for better Excel compatibility
  const delimiter = ';';

  // Create header row
  const headers = columns.map(col => `"${col.title}"`).join(delimiter);

  // Create data rows
  const rows = data.map(order => {
    return columns.map(column => {
      const value = order[column.field as keyof Order];

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
    }).join(delimiter);
  }).join('\n');

  // Combine headers and rows with BOM
  return `${BOM}${headers}\n${rows}`;
};

// Function to handle the export
const doExport = (
  data: Order[],
  columns: ColumnDefinition[],
  format: 'csv' | 'tsv' = 'csv',
  filename = `orders-export-${new Date().toISOString().slice(0, 10)}`
): boolean => {
  try {
    // Generate the content
    const fileContent = convertToExcelCSV(data, columns);

    // Set appropriate file extension
    const extension = format === 'csv' ? '.csv' : '.tsv';
    const fullFilename = filename.endsWith(extension) ? filename : `${filename}${extension}`;

    // Set MIME type
    const mimeType = format === 'csv'
      ? 'text/csv;charset=utf-8;'
      : 'text/tab-separated-values;charset=utf-8;';

    // Create blob and download
    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', fullFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};

interface ExcelExportButtonProps {
  data: Order[];
  columns: ColumnDefinition[];
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  data,
  columns,
  onSuccess,
  onError
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = (format: 'csv' | 'tsv') => {
    setExporting(true);

    try {
      const result = doExport(data, columns, format);
      if (result) {
        onSuccess?.();
      } else {
        onError?.(new Error('Export failed'));
      }
    } catch (error) {
      console.error('Export error:', error);
      onError?.(error instanceof Error ? error : new Error('Export failed'));
    } finally {
      setExporting(false);
      setShowOptions(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        disabled={exporting || data.length === 0}
      >
        {exporting ? (
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>Export</span>
      </button>

      {showOptions && (
        <div className="absolute z-10 mt-2 w-48 bg-white rounded shadow-lg border border-gray-200 py-1">
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium">Export Options</h3>
            <button
              onClick={() => setShowOptions(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-2">
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 rounded"
            >
              <FileText className="h-4 w-4" />
              <span>Excel CSV (.csv)</span>
            </button>

            <button
              onClick={() => handleExport('tsv')}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 rounded"
            >
              <File className="h-4 w-4" />
              <span>Excel TSV (.tsv)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelExportButton;