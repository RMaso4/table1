// src/app/custom/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SearchBar from '@/components/SearchBar';
import EditableCell from '@/components/EditableCell';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Order } from '@/types';
import { createExportOptions } from '@/utils/exportUtils';

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

export default function CustomPage() {
  const params = useParams();
  const router = useRouter();
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

  // Load page configuration from localStorage
  useEffect(() => {
    const loadPageConfig = () => {
      try {
        const savedPages = JSON.parse(localStorage.getItem('customPages') || '[]');
        const page = savedPages.find((p: CustomPage) => p.id === pageId);
        
        if (!page) {
          setError('Custom page not found');
          return false;
        }
        
        setPageConfig(page);
        return true;
      } catch (error) {
        console.error('Error loading page configuration:', error);
        setError('Failed to load page configuration');
        return false;
      }
    };

    const success = loadPageConfig();
    if (!success) {
      // Set a timeout to return to dashboard if page not found
      const timeout = setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
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
        (typeof order.verkoop_order === 'string' && order.verkoop_order.toLowerCase().includes(query)) ||
        (typeof order.project === 'string' && order.project.toLowerCase().includes(query)) ||
        (typeof order.debiteur_klant === 'string' && order.debiteur_klant.toLowerCase().includes(query)) ||
        (typeof order.material === 'string' && order.material.toLowerCase().includes(query)) ||
        (typeof order.opmerking === 'string' && order.opmerking.toLowerCase().includes(query))
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
    const exporter = createExportOptions(
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
    exporter.toCSV();
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
    </div>
  );
}