// src/utils/paginationUtils.ts

/**
 * Helper function to paginate an array of items
 */
export function paginateData<T>(data: T[], currentPage: number, itemsPerPage: number): T[] {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return data.slice(startIndex, endIndex);
}

/**
 * Calculate pagination information
 */
export function getPaginationInfo(totalItems: number, currentPage: number, itemsPerPage: number) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(currentPage * itemsPerPage, totalItems);

  return {
    totalPages,
    hasNextPage,
    hasPrevPage,
    firstItem,
    lastItem
  };
}

/**
 * Generate an array of page numbers for pagination UI
 * Will include first page, last page, current page, and pages around current page
 */
export function getPageNumbers(currentPage: number, totalPages: number, maxPages: number = 5): number[] {
  if (totalPages <= maxPages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfMaxPages = Math.floor(maxPages / 2);
  let startPage = Math.max(currentPage - halfMaxPages, 1);
  let endPage = startPage + maxPages - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(endPage - maxPages + 1, 1);
  }

  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  // Always include first and last page
  if (startPage > 1) {
    pages.unshift(1);
    if (startPage > 2) {
      pages.splice(1, 0, -1); // Add ellipsis
    }
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push(-1); // Add ellipsis
    }
    pages.push(totalPages);
  }

  return pages;
}