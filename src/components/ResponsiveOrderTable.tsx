// src/components/ResponsiveOrderTable.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Order } from '@/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import EditableCell from '@/components/EditableCell';
import RoleIndicator from '@/components/Roleindicator';
import { getEditableRoles } from '@/utils/columnPermissions';

interface ColumnDefinition {
  field: string;
  title: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  minWidth?: string;
  width?: string;
  editable?: boolean;
}

interface ResponsiveOrderTableProps {
  orders: Order[];
  columns: ColumnDefinition[];
  sortState: {
    field: string | null;
    direction: 'asc' | 'desc' | null;
  };
  onSort: (field: string) => void;
  onCellUpdate: (orderId: string, field: string, value: string | number | boolean) => Promise<void>;
  onAddToPriority: (orderId: string) => void;
  isPrioritized: (orderId: string) => boolean;
}

export default function ResponsiveOrderTable({
  orders,
  columns,
  sortState,
  onSort,
  onCellUpdate,
  onAddToPriority,
  isPrioritized
}: ResponsiveOrderTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // Check if table needs horizontal scrolling
  useEffect(() => {
    const checkScroll = () => {
      if (tableRef.current) {
        const { scrollWidth, clientWidth } = tableRef.current;
        setShowScrollHint(scrollWidth > clientWidth);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [columns]);

  return (
    <>
      {showScrollHint && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-2 animate-pulse">
          Scroll horizontally to see all columns
        </div>
      )}
      <div 
        ref={tableRef} 
        className="overflow-x-auto relative"
        style={{ maxWidth: '100%' }}
      >
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {/* Priority Action Column - Fixed width */}
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 w-12 px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Priority
              </th>
              
              {/* Data Columns */}
              {columns.map((column) => {
                const editableRoles = getEditableRoles(column.field);
                
                return (
                  <th 
                    key={column.field}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                    style={{ 
                      minWidth: column.minWidth || '120px',
                      width: column.width || 'auto'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span>{column.title}</span>
                        {editableRoles && editableRoles.length > 0 && (
                          <div className="flex mt-1">
                            <RoleIndicator roles={editableRoles} size="sm" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onSort(column.field)}
                        className="ml-1"
                      >
                        {sortState.field === column.field ? (
                          sortState.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {/* Priority Action Cell - Fixed position */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onAddToPriority(order.id)}
                      className={`p-2 rounded-full ${
                        isPrioritized(order.id)
                          ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                          : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        {isPrioritized(order.id) ? (
                          <path
                            fillRule="evenodd"
                            d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z"
                          />
                        )}
                      </svg>
                    </button>
                  </td>
                  
                  {/* Data Cells */}
                  {columns.map(column => (
                    <td 
                      key={`${order.id}-${column.field}`} 
                      className="px-6 py-4 whitespace-nowrap"
                      style={{ 
                        minWidth: column.minWidth || '120px',
                        width: column.width || 'auto'
                      }}
                    >
                      {column.type === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={!!order[column.field as keyof Order]}
                          onChange={(e) => onCellUpdate(order.id, column.field, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                      ) : column.type === 'date' ? (
                        column.field === 'updatedAt' ? (
                          order[column.field] ? new Date(order[column.field] as string).toLocaleDateString() : '-'
                        ) : (
                          <EditableCell
                            value={order[column.field as keyof Order] as string}
                            onChange={(value) => onCellUpdate(order.id, column.field, value)}
                            type="date"
                            field={column.field}
                            orderId={order.id}
                            orderNumber={order.verkoop_order}
                          />
                        )
                      ) : column.type === 'number' ? (
                        <EditableCell
                          value={order[column.field as keyof Order] as number}
                          onChange={(value) => onCellUpdate(order.id, column.field, Number(value))}
                          type="number"
                          field={column.field}
                          orderId={order.id}
                          orderNumber={order.verkoop_order}
                        />
                      ) : (
                        <EditableCell
                          value={order[column.field as keyof Order] as string}
                          onChange={(value) => onCellUpdate(order.id, column.field, value)}
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
                <td 
                  colSpan={columns.length + 1} 
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}