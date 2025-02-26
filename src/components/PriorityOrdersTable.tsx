// src/components/PriorityOrdersTable.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ArrowDown, GripVertical, X } from 'lucide-react';
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
  // Handle drag end event
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(orders);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Call parent callback with the new order
    onPriorityOrdersChange(items);
  };

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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="priority-orders">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="overflow-x-auto"
            >
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
                  {orders.map((order, index) => (
                    <Draggable
                      key={order.id}
                      draggableId={order.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <tr
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`hover:bg-gray-50 ${
                            snapshot.isDragging ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {index + 1}
                            </div>
                          </td>
                          <td
                            className="px-3 py-4 whitespace-nowrap cursor-move"
                            {...provided.dragHandleProps}
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
                              {order.lever_datum
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
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </tbody>
              </table>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}