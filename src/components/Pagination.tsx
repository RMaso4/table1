// src/components/Pagination.tsx
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getPageNumbers, getPaginationInfo } from '@/utils/paginationUtils';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeChanger?: boolean;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeChanger = true,
  className = '',
}: PaginationProps) {
  const { totalPages, hasNextPage, hasPrevPage, firstItem, lastItem } = getPaginationInfo(
    totalItems,
    currentPage,
    pageSize
  );

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Showing {firstItem} to {lastItem} of {totalItems} results
      </div>

      <div className="flex items-center space-x-1">
        {showPageSizeChanger && onPageSizeChange && (
          <div className="mr-4">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-1 px-2 text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={() => onChange(1)}
          disabled={!hasPrevPage}
          className="p-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        <button
          onClick={() => onChange(currentPage - 1)}
          disabled={!hasPrevPage}
          className="p-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((pageNumber, index) =>
          pageNumber === -1 ? (
            <span key={`ellipsis-${index}`} className="px-2 py-1">
              ...
            </span>
          ) : (
            <button
              key={pageNumber}
              onClick={() => onChange(pageNumber)}
              className={`px-3 py-1 rounded-md text-sm ${
                pageNumber === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {pageNumber}
            </button>
          )
        )}

        <button
          onClick={() => onChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="p-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          onClick={() => onChange(totalPages)}
          disabled={!hasNextPage}
          className="p-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}