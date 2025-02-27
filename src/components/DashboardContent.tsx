// src/components/DashboardContent.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Download } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

// Import custom components
import Navbar from '@/components/Navbar';
import SearchBar from '@/components/SearchBar';
import EditableCell from '@/components/EditableCell';
import FilterDialog from '@/components/FilterDialog';
import DraggableColumnHeader from '@/components/DraggableColumnHeader';
import RealTimeTestingTool from '@/components/RealTimeTestingTool';
import PusherConnectionDebugger from '@/components/PusherConnectionDebugger';
import PriorityOrdersTable from '@/components/PriorityOrdersTable';
import OrderTableActions from '@/components/OrderTableActions';

// Import real-time updates hook
import usePusher from '@/hooks/usePusher';

import { convertToExcelCSV, exportToExcel, createExcelExportOptions } from '@/utils/excelExportUtils';
import ExcelExportButton from '@/components/ExcelExportButton';

// Import types
import { Order } from '@/types';

// Define interfaces
interface FilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | boolean | null;
  value2?: string | number | null;
}

interface ColumnFilters {
  [key: string]: string;
}

interface SortState {
  field: string | null;
  direction: 'asc' | 'desc' | null;
}

interface ColumnDefinition {
  field: string;
  title: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

export default function DashboardContent() {
  const router = useRouter();
  const { data: session } = useSession();

  // Real-time updates state and hook
  const { isConnected, lastOrderUpdate, lastNotification } = usePusher();
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  // Priority orders state
  const [priorityOrders, setPriorityOrders] = useState<Order[]>([]);

  // Available columns configuration (memoized to prevent unnecessary re-renders)
  const availableColumns = useMemo<ColumnDefinition[]>(() => [
    { field: 'aanmaak_datum', title: 'aanmaak_datum', type: 'date' },
    { field: 'verkoop_order', title: 'Order #', type: 'text' },
    { field: 'project', title: 'Project', type: 'text' },
    { field: 'pos', title: 'Pos', type: 'number' },
    { field: 'type_artikel', title: 'type_artikel', type: 'text' },
    { field: 'debiteur_klant', title: 'debiteur_klant', type: 'text' },
    { field: 'material', title: 'Material', type: 'text' },
    { field: 'kantenband', title: 'kantenband', type: 'text' },
    { field: 'kleur', title: 'kleur', type: 'text' },
    { field: 'height', title: 'Height', type: 'number' },
    { field: 'db_waarde', title: 'db_waarde', type: 'number' },
    { field: 'opmerking', title: 'Opmerkingen', type: 'text' },
    { field: 'productie_datum', title: 'Productie Datum', type: 'date' },
    { field: 'lever_datum', title: 'Lever Datum', type: 'date' },
    { field: 'startdatum_assemblage', title: 'startdatum_assemblage', type: 'date' },
    { field: 'start_datum_machinale', title: 'start_datum_machinale', type: 'date' },
    { field: 'bruto_zagen', title: 'bruto_zagen', type: 'date' },
    { field: 'pers', title: 'pers', type: 'date' },
    { field: 'netto_zagen', title: 'netto_zagen', type: 'date' },
    { field: 'verkantlijmen', title: 'verkantlijmen', type: 'date' },
    { field: 'cnc_start_datum', title: 'cnc_start_datum', type: 'date' },
    { field: 'pmt_start_datum', title: 'pmt_start_datum', type: 'date' },
    { field: 'lakkerij_datum', title: 'lakkerij_datum', type: 'date' },
    { field: 'coaten_m1', title: 'coaten_m1', type: 'date' },
    { field: 'verkantlijmen_order_gereed', title: 'verkantlijmen_order_gereed', type: 'date' },
    { field: 'inpak_rail', title: 'inpak_rail', type: 'boolean' },
    { field: 'boards', title: 'Boards', type: 'boolean' },
    { field: 'frames', title: 'Frames', type: 'boolean' },
    { field: 'ap_tws', title: 'AP TWS', type: 'boolean' },
    { field: 'wp_frame', title: 'WP Frame', type: 'boolean' },
    { field: 'wp_dwp_pc', title: 'WP DWP PC', type: 'boolean' },
    { field: 'totaal_boards', title: 'Totaal Boards', type: 'number' },
    { field: 'inkoopordernummer', title: 'inkoopordernummer', type: 'text' },
    { field: 'updatedAt', title: 'updatedAt', type: 'date' }
  ], []);

  // State variables
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const processedUpdatesRef = useRef(new Set<string>());
  const processingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const updateThrottleTimeRef = useRef<Map<string, number>>(new Map());
  const [sortState, setSortState] = useState<SortState>({
    field: null,
    direction: null
  });
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>(
    availableColumns.map(col => col.field)
  );
  const [lastUpdateToast, setLastUpdateToast] = useState<string | null>(null);

  // Load priority orders from localStorage on component mount
  useEffect(() => {
    const savedPriorityOrders = localStorage.getItem('priorityOrders');
    if (savedPriorityOrders) {
      try {
        const parsedOrders = JSON.parse(savedPriorityOrders);
        setPriorityOrders(parsedOrders);
      } catch (error) {
        console.error('Error parsing saved priority orders:', error);
      }
    }
  }, []);

  // Save priority orders to localStorage when they change
  useEffect(() => {
    localStorage.setItem('priorityOrders', JSON.stringify(priorityOrders));
  }, [priorityOrders]);

  // Add an order to the priority list
  const addToPriorityList = (orderId: string) => {
    const orderToAdd = orders.find(order => order.id === orderId);
    if (!orderToAdd) return;

    // Check if the order is already in the priority list
    if (priorityOrders.some(order => order.id === orderId)) return;

    // Add the order to the priority list
    setPriorityOrders(prev => [...prev, orderToAdd]);

    // Show confirmation toast
    setLastUpdateToast(`Added ${orderToAdd.verkoop_order} to priority list`);
    setTimeout(() => setLastUpdateToast(null), 3000);
  };

  // Remove an order from the priority list
  const removeFromPriorityList = (orderId: string) => {
    const orderToRemove = priorityOrders.find(order => order.id === orderId);
    if (!orderToRemove) return;

    // Remove the order from the priority list
    setPriorityOrders(prev => prev.filter(order => order.id !== orderId));

    // Show confirmation toast
    setLastUpdateToast(`Removed ${orderToRemove.verkoop_order} from priority list`);
    setTimeout(() => setLastUpdateToast(null), 3000);
  };

  // Update priority orders (used for reordering)
  const updatePriorityOrders = (newOrders: Order[]) => {
    setPriorityOrders(newOrders);
  };

  // Check if an order is in the priority list
  const isOrderPrioritized = (orderId: string) => {
    return priorityOrders.some(order => order.id === orderId);
  };

  // Handle export functionality
  const handleExport = () => {
    // Get visible columns in their current order
    const visibleColumns = columnOrder
      .map(field => availableColumns.find(col => col.field === field))
      .filter((col): col is ColumnDefinition => col !== undefined);

    try {
      // Use the improved Excel export function
      exportToExcel(
        filteredOrders,
        visibleColumns,
        `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
      );

      // Show success toast
      setLastUpdateToast('Export successful');
      setTimeout(() => setLastUpdateToast(null), 3000);
    } catch (error) {
      setError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Replace the existing handleExportPriority function with this:
  const handleExportPriority = () => {
    if (priorityOrders.length === 0) {
      setError('No priority orders to export');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Define essential columns for priority export
    const priorityColumns: ColumnDefinition[] = [
      { field: 'verkoop_order', title: 'Order #', type: 'text' },
      { field: 'project', title: 'Project', type: 'text' },
      { field: 'debiteur_klant', title: 'Customer', type: 'text' },
      { field: 'material', title: 'Material', type: 'text' },
      { field: 'lever_datum', title: 'Delivery Date', type: 'date' },
    ];

    try {
      // Use the improved Excel export function
      exportToExcel(
        priorityOrders,
        priorityColumns,
        `priority-orders-export-${new Date().toISOString().slice(0, 10)}.csv`
      );

      // Show success toast
      setLastUpdateToast('Priority export successful');
      setTimeout(() => setLastUpdateToast(null), 3000);
    } catch (error) {
      setError(`Priority export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Load saved column order
  useEffect(() => {
    const savedOrder = localStorage.getItem('columnOrder');
    if (savedOrder) {
      try {
        setColumnOrder(JSON.parse(savedOrder));
      } catch (error) {
        console.error('Error parsing saved column order:', error);
        setColumnOrder(availableColumns.map(col => col.field));
      }
    }
  }, [availableColumns]);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem('columnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Memoized filtering function
  const applyFilters = useCallback(() => {
    let result = [...orders];

    // Apply column filters
    Object.entries(columnFilters).forEach(([field, filterValue]) => {
      if (filterValue) {
        result = result.filter(order => {
          const value = order[field as keyof Order];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    // Apply global search
    if (globalSearchQuery) {
      const searchLower = globalSearchQuery.toLowerCase();
      result = result.filter(order =>
        order.verkoop_order.toLowerCase().includes(searchLower) ||
        order.project?.toLowerCase().includes(searchLower) ||
        order.debiteur_klant.toLowerCase().includes(searchLower)
      );
    }

    // Apply advanced filters
    activeFilters.forEach(filter => {
      result = result.filter(order => {
        const value = order[filter.field as keyof Order];

        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greaterThan':
            return value !== null && value !== undefined && filter.value !== null && value > filter.value;
          case 'lessThan':
            return value !== null && value !== undefined && filter.value !== null && value < filter.value;
          case 'between':
            return value !== null && value !== undefined &&
              filter.value2 !== undefined && filter.value2 !== null &&
              filter.value !== null &&
              value >= filter.value &&
              value <= filter.value2;
          default:
            return;
        }
      });
    });

    // Apply sorting if a sort field is selected
    if (sortState.field) {
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
  }, [orders, columnFilters, globalSearchQuery, activeFilters, sortState]);

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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

        // Update priority orders with fresh data
        setPriorityOrders(prev => {
          return prev.map(priorityOrder => {
            const updatedOrder = data.find((order: Order) => order.id === priorityOrder.id);
            return updatedOrder || priorityOrder;
          }).filter(order => !!order);
        });
      } catch (err) {
        setError('Failed to load orders');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // This specific useEffect in DashboardContent.tsx needs updating
  // Replace the existing useEffect for handling real-time order updates with this:

  // Then in your useEffect for real-time updates:
  // Then in your useEffect for real-time updates:
  useEffect(() => {
    // Skip if real-time updates are disabled or no update received
    if (!realtimeEnabled || !lastOrderUpdate || !lastOrderUpdate.orderId || !lastOrderUpdate.data) {
      return;
    }
  
    const orderId = lastOrderUpdate.orderId;
    const now = Date.now();
  
    // 1. Throttle rapid updates for the same order
    const lastUpdateTime = updateThrottleTimeRef.current.get(orderId) || 0;
    const timeSinceLastUpdate = now - lastUpdateTime;
  
    if (timeSinceLastUpdate < 3000) { // 3 second minimum between updates
      console.log(`Throttling update for ${orderId} - last update was ${timeSinceLastUpdate}ms ago`);
      return;
    }
  
    // 2. Check if this exact update is already being processed
    // Create a combined key of orderId + content hash to identify uniqueness
    const contentKey = `${orderId}-${JSON.stringify(lastOrderUpdate.data)}`;
  
    if (processedUpdatesRef.current.has(contentKey)) {
      console.log('Ignoring duplicate update with key:', contentKey);
      return;
    }
  
    // Mark this update as being processed
    processedUpdatesRef.current.add(contentKey);
    updateThrottleTimeRef.current.set(orderId, now);
  
    // Clear any existing timeout for this order
    if (processingTimeoutsRef.current.has(orderId)) {
      clearTimeout(processingTimeoutsRef.current.get(orderId)!);
    }
  
    // Show toast notification (only when we actually process the update)
    const orderNumber = lastOrderUpdate.data.verkoop_order || orderId;
    setLastUpdateToast(`Order ${orderNumber} updated`);
    setTimeout(() => setLastUpdateToast(null), 3000);
  
    console.log('Processing real-time order update:', lastOrderUpdate);
  
    // Create a new order object from the update data
    const updatedOrderData = {
      ...lastOrderUpdate.data,
      id: orderId // Ensure ID is preserved
    } as Order;
  
    // Update orders with the new data - create a new reference
    setOrders(prevOrders => {
      // Find the order index to update
      const orderIndex = prevOrders.findIndex(order => order.id === orderId);
  
      // If order exists, update it
      if (orderIndex !== -1) {
        const updatedOrders = [...prevOrders];
        // Create a merged object with all the current properties + the updated ones
        updatedOrders[orderIndex] = {
          ...updatedOrders[orderIndex],
          ...updatedOrderData,
        };
  
        console.log('Updated order in state:', updatedOrders[orderIndex]);
        return updatedOrders;
      }
  
      // If we have a full order object and it's not in our list yet, add it
      // Only add if we're not filtering (to avoid confusion)
      if (
        Object.keys(updatedOrderData).length > 2 && // Has more than just id and orderId
        !Object.keys(columnFilters).length &&
        !globalSearchQuery &&
        !activeFilters.length
      ) {
        console.log('Adding new order to state:', updatedOrderData);
        return [...prevOrders, updatedOrderData];
      }
  
      // Otherwise, don't change anything
      return prevOrders;
    });
  
    // IMPROVED PRIORITY ORDERS UPDATE LOGIC
    setPriorityOrders(prevPriorityOrders => {
      // Check if this order exists in the priority list
      const priorityOrderIndex = prevPriorityOrders.findIndex(order => order.id === orderId);
      
      // If the order isn't in our priority list, no need to update
      if (priorityOrderIndex === -1) return prevPriorityOrders;
      
      // Order exists in priority list - create a copy to update it
      const updatedPriorityOrders = [...prevPriorityOrders];
      
      // Get the current version of the order from our priority list
      const currentPriorityOrder = updatedPriorityOrders[priorityOrderIndex];
      
      // Create an updated version with the latest changes while preserving all fields
      updatedPriorityOrders[priorityOrderIndex] = {
        ...currentPriorityOrder,  // Keep all existing fields
        ...updatedOrderData,      // Apply new changes
        id: orderId               // Ensure ID is preserved
      };
      
      console.log('Updated priority order:', updatedPriorityOrders[priorityOrderIndex]);
      
      // Since we're modifying the priority orders, update localStorage as well 
      localStorage.setItem('priorityOrders', JSON.stringify(updatedPriorityOrders));
      
      return updatedPriorityOrders;
    });
  
    // Set a timeout to forget about this update after some time
    // This prevents memory leaks and allows re-processing if the same update comes much later
    const cleanupTimeout = setTimeout(() => {
      processedUpdatesRef.current.delete(contentKey);
      processingTimeoutsRef.current.delete(orderId);
    }, 30000); // Keep track for 30 seconds
  
    processingTimeoutsRef.current.set(orderId, cleanupTimeout);
  
  }, [lastOrderUpdate, realtimeEnabled, columnFilters, globalSearchQuery, activeFilters, orders]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      // Clear all processing timeouts to prevent memory leaks
      processingTimeoutsRef.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      processingTimeoutsRef.current.clear();
      processedUpdatesRef.current.clear();
      updateThrottleTimeRef.current.clear();
    };
  }, []);

  // Handle notifications from real-time updates
  useEffect(() => {
    if (realtimeEnabled && lastNotification) {
      // Show a toast or some visual indication of the notification
      const message = lastNotification.message;
      setLastUpdateToast(message);

      // Clear toast after 3 seconds
      setTimeout(() => setLastUpdateToast(null), 3000);

      console.log('Notification received:', message);
    }
  }, [lastNotification, realtimeEnabled]);

  // Handler functions
  const handleGlobalSearch = (query: string) => {
    setGlobalSearchQuery(query);
  };

  const handleColumnSearch = (field: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleColumnSort = (field: string) => {
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

  const handleApplyFilters = (filters: FilterConfig[]) => {
    setActiveFilters(filters);
  };

  // Replace the entire handleCellUpdate function in DashboardContent.tsx

  const handleCellUpdate = async (orderId: string, field: string, value: string | number | boolean): Promise<void> => {
    try {
      // Reset any previous errors
      setError(null);

      console.log(`Updating cell ${field} for order ${orderId} to:`, value);

      // Find the order to update
      const orderToUpdate = orders.find(order => order.id === orderId);
      if (!orderToUpdate) {
        throw new Error('Order not found');
      }

      // Create a copy of the order with the updated field
      const updatedOrder = {
        ...orderToUpdate,
        [field]: value,
        updatedAt: new Date().toISOString() // Update the timestamp locally
      };

      // Optimistically update the orders state
      setOrders(prevOrders =>
        prevOrders.map(order => order.id === orderId ? updatedOrder : order)
      );

      // Also update priority orders if needed
      setPriorityOrders(prevOrders => {
        // Check if the order is in the priority list
        const orderIndex = prevOrders.findIndex(order => order.id === orderId);
        if (orderIndex === -1) return prevOrders; // Not in the list

        // Create a new array with updated order
        const newPriorityOrders = [...prevOrders];
        newPriorityOrders[orderIndex] = updatedOrder;
        return newPriorityOrders;
      });

      // Prepare the API request data
      const updateData = { [field]: value };

      // Make the API request
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData),
      });

      // Check if response is ok
      if (!response.ok) {
        // Try to parse error response
        const errorData = await response.json().catch(() => ({}));

        // Revert optimistic update on error
        setOrders(prevOrders =>
          prevOrders.map(order => order.id === orderId ? orderToUpdate : order)
        );

        setPriorityOrders(prevOrders => {
          const orderIndex = prevOrders.findIndex(order => order.id === orderId);
          if (orderIndex === -1) return prevOrders;

          const revertedPriorityOrders = [...prevOrders];
          revertedPriorityOrders[orderIndex] = orderToUpdate;
          return revertedPriorityOrders;
        });

        throw new Error(errorData.error || errorData.message || 'Failed to update order');
      }

      // Parse response data
      const data = await response.json();

      // If real-time updates are enabled, the update will arrive through Pusher
      // If disabled, we need to manually trigger a notification here
      if (!realtimeEnabled) {
        // Show a brief success message
        setLastUpdateToast(`Updated ${field} successfully`);
        setTimeout(() => setLastUpdateToast(null), 2000);
      }

      // We should also trigger an event to notify other clients about this update
      // This will reach this client too via Pusher if real-time is enabled
      try {
        // Use our trigger function directly if available
        if (typeof window !== 'undefined') {
          // Trigger the event using the API
          fetch('/api/socket', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: 'order:updated',
              data: {
                orderId,
                data: updatedOrder
              }
            })
          }).catch(err => {
            console.error('Failed to emit update event:', err);
          });
        }
      } catch (emitError) {
        console.warn('Failed to emit update event:', emitError);
        // Non-critical, don't throw
      }

      return;

    } catch (error) {
      console.error('Error updating cell:', error);

      // Show error message
      setError(error instanceof Error ? error.message : 'Failed to update order');

      // Clear error after a delay
      setTimeout(() => setError(null), 5000);

      return;
    }
  };

  // 3. Either use the savePriorityOrdersToBackend function or comment it
  // Example of how to use it (call it after updating priorities):
  // const addToPriorityList = (orderId: string) => {
  //   const orderToAdd = orders.find(order => order.id === orderId);
  //   if (!orderToAdd) return;

  //   // Check if the order is already in the priority list
  //   if (priorityOrders.some(order => order.id === orderId)) return;

  //   // Add the order to the priority list
  //   setPriorityOrders(prev => [...prev, orderToAdd]);

  //   // Show confirmation toast
  //   setLastUpdateToast(`Added ${orderToAdd.verkoop_order} to priority list`);
  //   setTimeout(() => setLastUpdateToast(null), 3000);

  //   // Save to backend when adding to priority list
  //   savePriorityOrdersToBackend();
  // };

  // OR if you're not using it yet, you can comment it out:
  // const savePriorityOrdersToBackend = async () => {
  //   try {
  //     // In a full implementation, you would save the priority orders to your backend
  //     // For now, we're just using localStorage, but here's how you could implement it:
  //     /*
  //     const response = await fetch('/api/priority-orders', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         priorityOrders: priorityOrders.map(order => order.id)
  //       }),
  //     });
  //
  //     if (!response.ok) {
  //       throw new Error('Failed to save priority orders');
  //     }
  //     */
  //
  //     // For now we'll just show a success message
  //     setLastUpdateToast('Priority order saved');
  //     setTimeout(() => setLastUpdateToast(null), 3000);
  //   } catch (error) {
  //     console.error('Error saving priority orders:', error);
  //     setError('Failed to save priority orders');
  //     setTimeout(() => setError(null), 3000);
  //   }
  // };

  // Column drag and drop handlers
  const handleColumnDragStart = (e: React.DragEvent<Element>, field: string) => {
    setDraggingColumn(field);
  };

  const handleColumnDragOver = (e: React.DragEvent<Element>, field: string) => {
    e.preventDefault(); // Prevent default to allow drop
    if (!draggingColumn || draggingColumn === field) return;

    const newColumnOrder = [...columnOrder];
    const dragIndex = newColumnOrder.indexOf(draggingColumn);
    const dropIndex = newColumnOrder.indexOf(field);

    newColumnOrder.splice(dragIndex, 1);
    newColumnOrder.splice(dropIndex, 0, draggingColumn);

    setColumnOrder(newColumnOrder);
  };

  const handleColumnDragEnd = () => {
    setDraggingColumn(null);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters([]);
    setColumnFilters({});
    setGlobalSearchQuery('');
    setSortState({ field: null, direction: null });
    setFilteredOrders(orders);
  };

  // Define essential columns for priority export
  const priorityColumns: ColumnDefinition[] = [
    { field: 'verkoop_order', title: 'Order #', type: 'text' },
    { field: 'project', title: 'Project', type: 'text' },
    { field: 'debiteur_klant', title: 'Customer', type: 'text' },
    { field: 'material', title: 'Material', type: 'text' },
    { field: 'lever_datum', title: 'Delivery Date', type: 'date' },
  ];

  // Logout handler
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (res.ok) {
        await signOut({ redirect: false });
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Navbar onLogout={handleLogout} />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <Navbar onLogout={handleLogout} />
        <div className="flex-1 p-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Navbar onLogout={handleLogout} />

        <div className="p-8 flex-grow overflow-auto">
          {lastUpdateToast && (
            <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow z-50">
              {lastUpdateToast}
            </div>
          )}

          {/* Priority Orders Table */}
          <PriorityOrdersTable
            orders={priorityOrders}
            onRemoveFromPriority={removeFromPriorityList}
            onPriorityOrdersChange={updatePriorityOrders}
          />

          {/* Main Orders Table */}
          <div className="bg-white rounded-lg shadow mb-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h1 className="text-xl font-semibold text-gray-900">Order Overview</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Real-time updates:</span>
                  <button
                    onClick={() => setRealtimeEnabled(!realtimeEnabled)}
                    className={`px-3 py-1 text-sm rounded ${realtimeEnabled
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                      }`}
                  >
                    {realtimeEnabled ? 'Enabled' : 'Disabled'}
                  </button>

                  {isConnected ? (
                    <span className="flex items-center text-xs text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center text-xs text-red-600">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                      Disconnected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <ExcelExportButton
                    data={filteredOrders}
                    columns={columnOrder
                      .map(field => availableColumns.find(col => col.field === field))
                      .filter((col): col is ColumnDefinition => col !== undefined)}
                    onSuccess={() => {
                      setLastUpdateToast('Export successful');
                      setTimeout(() => setLastUpdateToast(null), 3000);
                    }}
                    onError={(error) => {
                      setError(`Export failed: ${error.message}`);
                      setTimeout(() => setError(null), 3000);
                    }}
                  />


                  {/* Export Priority Button - DELETE THIS ENTIRE BUTTON BLOCK */}
                  {priorityOrders.length > 0 && (
                    <button
                      onClick={handleExportPriority}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                      title="Export priority orders to CSV"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Priority</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setIsFilterDialogOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800"
                >
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                </button>
                <SearchBar
                  onSearch={handleGlobalSearch}
                  value={globalSearchQuery}
                />
                {(activeFilters.length > 0 ||
                  Object.keys(columnFilters).length > 0 ||
                  globalSearchQuery ||
                  sortState.field) && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear all filters
                    </button>
                  )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Priority Action Column */}
                    <th className="w-12 px-2 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>

                    {/* Regular Columns */}
                    {columnOrder.map(field => {
                      const column = availableColumns.find(col => col.field === field)!;
                      return (
                        <DraggableColumnHeader
                          key={field}
                          title={column.title}
                          field={field}
                          onSearch={(value) => handleColumnSearch(field, value)}
                          sortDirection={sortState.field === field ? sortState.direction : null}
                          onSort={() => handleColumnSort(field)}
                          onDragStart={handleColumnDragStart}
                          onDragOver={handleColumnDragOver}
                          onDragEnd={handleColumnDragEnd}
                          isDragging={draggingColumn === field}
                        />
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        {/* Priority Action Cell */}
                        <td className="px-2 py-4 whitespace-nowrap">
                          <OrderTableActions
                            orderId={order.id}
                            isPrioritized={isOrderPrioritized(order.id)}
                            onAddToPriority={addToPriorityList}
                          />
                        </td>

                        {/* Regular Data Cells */}
                        {columnOrder.map(field => {
                          const column = availableColumns.find(col => col.field === field)!;
                          return (
                            <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {column.type === 'boolean' ? (
                                <input
                                  type="checkbox"
                                  checked={order[field as keyof Order] as boolean}
                                  onChange={(e) => handleCellUpdate(order.id, field, e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              ) : column.type === 'date' ? (
                                field === 'updatedAt' ? (
                                  order[field] ? new Date(order[field] as string).toLocaleDateString() : '-'
                                ) : (
                                  <EditableCell
                                    value={order[field as keyof Order] as string}
                                    onChange={(value) => handleCellUpdate(order.id, field, value)}
                                    type="date"
                                    field={field}
                                    orderId={order.id}
                                    orderNumber={order.verkoop_order}
                                  />
                                )
                              ) : column.type === 'number' ? (
                                <EditableCell
                                  value={order[field as keyof Order] as number}
                                  onChange={(value) => handleCellUpdate(order.id, field, Number(value))}
                                  type="number"
                                  field={field}
                                  orderId={order.id}
                                  orderNumber={order.verkoop_order}
                                />
                              ) : (
                                <EditableCell
                                  value={order[field as keyof Order] as string}
                                  onChange={(value) => handleCellUpdate(order.id, field, value)}
                                  field={field}
                                  orderId={order.id}
                                  orderNumber={order.verkoop_order}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columnOrder.length + 1} className="px-6 py-4 text-center text-sm text-gray-500">
                        {globalSearchQuery || Object.keys(columnFilters).length > 0 || activeFilters.length > 0 ?
                          'No orders match the current filters.' :
                          'No orders found. Add an order to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

      <FilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplyFilters={handleApplyFilters}
        availableColumns={availableColumns}
      />
    </div>
  </div>
  );
}