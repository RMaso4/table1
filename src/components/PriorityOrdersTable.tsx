// src/components/PriorityOrdersTable.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { GripVertical, X } from 'lucide-react';
import { Order } from '@/types';

interface PriorityOrdersTableProps {
  orders: Order[];
  onRemoveFromPriority: (orderId: string) => void;
  onPriorityOrdersChange: (priorityOrders: Order[]) => void;
}

export default function PriorityOrdersTable({
  orders,
  onRemoveFromPriority,
  onPriorityOrdersChange,
}: PriorityOrdersTableProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Safely handle drag start
  const handleDragStart = useCallback((e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    // Set data transfer for compatibility
    e.dataTransfer.setData('text/plain', index.toString());
    // Set visual effect
    e.currentTarget.classList.add('bg-blue-50');
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent<HTMLTableRowElement>, _index: number) => { // Fixed: Added underscore prefix
    e.preventDefault();
    // Don't need to use index parameter directly, using it in event handlers is sufficient
    e.currentTarget.classList.add('border-t-2', 'border-blue-500');
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('border-t-2', 'border-blue-500');
  }, []);

  // Handle drop with stable references
  const handleDrop = useCallback((e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-t-2', 'border-blue-500');
    
    if (draggedIndex === null) return;
    
    // Create a new array with the reordered items
    // Important: Use the exact same object references, just in a different order
    const newOrders = [...orders];
    const [movedItem] = newOrders.splice(draggedIndex, 1);
    newOrders.splice(targetIndex, 0, movedItem);
    
    // Call the parent's onPriorityOrdersChange with the new order
    onPriorityOrdersChange(newOrders);
    
    // Reset dragged index
    setDraggedIndex(null);
  }, [draggedIndex, orders, onPriorityOrdersChange]);

  // Handle drag end
  const handleDragEnd = useCallback((e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('bg-blue-50');
    setDraggedIndex(null);
  }, []);

  // Reset draggedIndex when orders change externally
  useEffect(() => {
    setDraggedIndex(null);
  }, [orders]);

  // If there are no priority orders, show a placeholder message
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow mb-4 p-6 border-2 border-dashed border-gray-300">
        <div className="text-center text-gray-500">
          <p className="mb-2 font-medium">Priority Table</p>
          <p className="text-sm">Drag orders here to prioritize them</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow mb-4">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Priority Orders</h2>
        <div className="text-sm text-gray-500">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} prioritized
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="w-12 px-3 py-3"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Material
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Delivery Date
              </th>
              <th className="w-12 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order, rowIndex) => (
              <tr
                key={`priority-${order.id}-${rowIndex}`}
                draggable
                onDragStart={(e) => handleDragStart(e, rowIndex)}
                onDragOver={(e) => handleDragOver(e, rowIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, rowIndex)}
                onDragEnd={handleDragEnd}
                className="hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {rowIndex + 1}
                  </div>
                </td>
                <td
                  className="px-3 py-4 whitespace-nowrap cursor-move"
                >
                  <GripVertical className="h-5 w-5 text-gray-400" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {order.verkoop_order}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {order.project || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {order.debiteur_klant}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {order.material}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {order.lever_datum && (typeof order.lever_datum === 'string' || typeof order.lever_datum === 'number')
                      ? new Date(order.lever_datum).toLocaleDateString()
                      : '-'}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => onRemoveFromPriority(order.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Remove from priority"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}