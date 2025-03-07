// src/app/custom/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SearchBar from '@/components/SearchBar';
import EditableCell from '@/components/EditableCell';
import { ChevronDown, ChevronUp, Download, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Order } from '@/types';
import { createExcelExportOptions } from '@/utils/excelExportUtils';

// Define the custom page type
interface CustomPage {
  id: string;
  name: string;
  path: string;
  columns: string[];
}

// Define column definition for use in the table
interface ColumnDefinition {
  field: string;
  title: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

// Confirmation dialog component
function DeleteConfirmationDialog({
  isOpen,
  pageName,
  onConfirm,
  onCancel
}: {
  isOpen: boolean;
  pageName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Page</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the page &quot;{pageName}&quot;? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const pageId = params?.id as string;

  // State variables
  const [pageConfig, setPageConfig] = useState<CustomPage | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortState, setSortState] = useState<{
    field: string | null;
    direction: 'asc' | 'desc' | null;
  }>({
    field: null,
    direction: null
  });
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user is a beheerder
  const isBeheerder = session?.user?.role === 'BEHEERDER';

  // Column definitions (same as in AddPage)
  const allColumns = useMemo<ColumnDefinition[]>(() => [
    { field: 'aanmaak_datum', title: 'Aanmaak Datum', type: 'date' },
    { field: 'verkoop_order', title: 'Order #', type: 'text' },
    { field: 'project', title: 'Project', type: 'text' },
    { field: 'pos', title: 'Pos', type: 'number' },
    { field: 'type_artikel', title: 'Type Artikel', type: 'text' },
    { field: 'debiteur_klant', title: 'Debiteur Klant', type: 'text' },
    { field: 'material', title: 'Material', type: 'text' },
    { field: 'kantenband', title: 'Kantenband', type: 'text' },
    { field: 'kleur', title: 'Kleur', type: 'text' },
    { field: 'height', title: 'Height', type: 'number' },
    { field: 'db_waarde', title: 'DB Waarde', type: 'number' },
    { field: 'opmerking', title: 'Opmerkingen', type: 'text' },
    { field: 'productie_datum', title: 'Productie Datum', type: 'date' },
    { field: 'lever_datum', title: 'Lever Datum', type: 'date' },
    { field: 'bruto_zagen', title: 'Bruto Zagen', type: 'date' },
    { field: 'pers', title: 'Pers', type: 'date' },
    { field: 'netto_zagen', title: 'Netto Zagen', type: 'date' },
    { field: 'verkantlijmen', title: 'Verkantlijmen', type: 'date' },
    { field: 'boards', title: 'Boards', type: 'boolean' },
    { field: 'frames', title: 'Frames', type: 'boolean' },
    { field: 'totaal_boards', title: 'Totaal Boards', type: 'number' },
    { field: 'inkoopordernummer', title: 'Inkoopordernummer', type: 'text' },
    { field: 'updatedAt', title: 'Updated At', type: 'date' }
  ], []);

  // Fetch page configuration from API
  useEffect(() => {
    const fetchPageConfig = async () => {
      try {
        setLoading(true);
        // First fetch all custom pages
        const response = await fetch('/api/custom-pages');

        if (!response.ok) {
          throw new Error('Failed to fetch custom pages');
        }

        const pages = await response.json();
        const page = pages.find((p: CustomPage) => p.id === pageId);

        if (!page) {
          setError('Custom page not found');

          // Set a timeout to return to dashboard if page not found
          const timeout = setTimeout(() => {
            router.push('/dashboard');
          }, 3000);

          return () => clearTimeout(timeout);
        }

        setPageConfig(page);
      } catch (error) {
        console.error('Error fetching page configuration:', error);
        setError('Failed to load page configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchPageConfig();
  }, [pageId, router]);

  // Fetch orders on component mount
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const data = await response.json();
        setOrders(data);
        setFilteredOrders(data);
      } catch (err) {
        setError('Failed to load orders');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Apply search and sorting when dependencies change
  useEffect(() => {
    let result = [...orders];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order =>
        order.verkoop_order?.toLowerCase().includes(query) ||
        order.project?.toLowerCase().includes(query) ||
        order.debiteur_klant?.toLowerCase().includes(query) ||
        order.material?.toLowerCase().includes(query) ||
        (typeof order.opmerking === 'string' ? order.opmerking.toLowerCase() : '').includes(query)
      );
    }

    // Apply sorting
    if (sortState.field && sortState.direction) {
      result.sort((a, b) => {
        const aValue = a[sortState.field as keyof Order];
        const bValue = b[sortState.field as keyof Order];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) return sortState.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortState.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredOrders(result);
  }, [orders, searchQuery, sortState]);

  // Handle column sorting
  const handleSort = (field: string) => {
    setSortState(prev => ({
      field,
      direction:
        prev.field === field
          ? prev.direction === 'asc'
            ? 'desc'
            : prev.direction === 'desc'
              ? null
              : 'asc'
          : 'asc'
    }));
  };

  // Handle page deletion
  const deletePage = async () => {
    if (!pageConfig) return;

    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetch('/api/custom-pages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: pageConfig.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete page');
      }

      // Success - redirect to dashboard
      setToast(`Page "${pageConfig.name}" deleted successfully`);

      // Redirect after a brief delay to show the success message
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (error) {
      console.error('Error deleting page:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete page');
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  // Handle cell update
  const handleCellUpdate = async (orderId: string, field: string, value: string | number | boolean) => {
    try {
      // Find the order to update
      const orderToUpdate = orders.find(order => order.id === orderId);
      if (!orderToUpdate) {
        throw new Error('Order not found');
      }

      // Create a copy of the order with the updated field
      const updatedOrder = {
        ...orderToUpdate,
        [field]: value
      };

      // Optimistically update the orders state
      setOrders(prev =>
        prev.map(order => order.id === orderId ? updatedOrder : order)
      );

      // Send update to the server
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      // Show success toast
      setToast(`Updated ${field} successfully`);
      setTimeout(() => setToast(null), 3000);

    } catch (error) {
      console.error('Error updating cell:', error);
      setError(error instanceof Error ? error.message : 'Failed to update order');

      // Reset the orders to the original state
      const originalOrder = orders.find(order => order.id === orderId);
      if (originalOrder) {
        setOrders(prev =>
          prev.map(order => order.id === orderId ? originalOrder : order)
        );
      }

      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle export
  const handleExport = () => {
    if (!pageConfig) return;

    // Filter columns based on page configuration
    const exportColumns = pageConfig.columns
      .map(field => allColumns.find(col => col.field === field))
      .filter((col): col is ColumnDefinition => col !== undefined);

    // Create export utilities
    const exporter = createExcelExportOptions(
      filteredOrders,
      exportColumns,
      // Success callback
      () => {
        setToast('Export successful');
        setTimeout(() => setToast(null), 3000);
      },
      // Error callback
      (error) => {
        setError(`Export failed: ${error.message}`);
        setTimeout(() => setError(null), 3000);
      }
    );

    // Export with custom filename
    exporter.toExcel();
  };

  if (loading || !pageConfig) {
    return (
      <div className="flex h-screen">
        <Navbar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <Navbar />
        <div className="flex-1 p-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get column definitions for the selected columns
  const visibleColumns = pageConfig.columns
    .map(field => allColumns.find(col => col.field === field))
    .filter((col): col is ColumnDefinition => col !== undefined);

  return (
    <div className="flex h-screen">
      <Navbar />
      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        <div className="p-8 flex-grow overflow-auto">
          {toast && (
            <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow z-50">
              {toast}
            </div>
          )}

          <div className="bg-white rounded-lg shadow mb-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h1 className="text-xl font-semibold text-gray-900">{pageConfig.name}</h1>
              <div className="flex items-center gap-4">
                {/* Only show delete button for beheerder users */}
                {isBeheerder && (
                  <button
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{isDeleting ? 'Deleting...' : 'Delete Page'}</span>
                  </button>
                )}

                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  disabled={filteredOrders.length === 0}
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
                <SearchBar
                  onSearch={setSearchQuery}
                  value={searchQuery}
                  placeholder="Search orders..."
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {visibleColumns.map((column) => (
                      <th
                        key={column.field}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(column.field)}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{column.title}</span>
                          {sortState.field === column.field && (
                            <span>
                              {sortState.direction === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        {visibleColumns.map((column) => (
                          <td key={column.field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {column.type === 'boolean' ? (
                              <input
                                type="checkbox"
                                checked={!!order[column.field as keyof Order]}
                                onChange={(e) => handleCellUpdate(order.id, column.field, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            ) : column.type === 'date' ? (
                              column.field === 'updatedAt' ? (
                                order[column.field] ? new Date(order[column.field] as string).toLocaleDateString() : '-'
                              ) : (
                                <EditableCell
                                  value={order[column.field as keyof Order] as string}
                                  onChange={(value) => handleCellUpdate(order.id, column.field, value)}
                                  type="date"
                                  field={column.field}
                                  orderId={order.id}
                                  orderNumber={order.verkoop_order}
                                />
                              )
                            ) : column.type === 'number' ? (
                              <EditableCell
                                value={order[column.field as keyof Order] as number}
                                onChange={(value) => handleCellUpdate(order.id, column.field, Number(value))}
                                type="number"
                                field={column.field}
                                orderId={order.id}
                                orderNumber={order.verkoop_order}
                              />
                            ) : (
                              <EditableCell
                                value={order[column.field as keyof Order] as string}
                                onChange={(value) => handleCellUpdate(order.id, column.field, value)}
                                field={column.field}
                                orderId={order.id}
                                orderNumber={order.verkoop_order}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={visibleColumns.length} className="px-6 py-4 text-center text-sm text-gray-500">
                        {searchQuery ? 'No orders match your search.' : 'No orders found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirmation}
        pageName={pageConfig.name}
        onConfirm={deletePage}
        onCancel={() => setShowDeleteConfirmation(false)}
      />
    </div>
  );
}