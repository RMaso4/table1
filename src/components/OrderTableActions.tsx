// src/components/OrderTableActions.tsx
'use client';

import React from 'react';
import { ArrowUp, Trash2, Star } from 'lucide-react';

interface OrderTableActionsProps {
  orderId: string;
  isPrioritized: boolean;
  onAddToPriority: (orderId: string) => void;
}

export default function OrderTableActions({
  orderId,
  isPrioritized,
  onAddToPriority,
}: OrderTableActionsProps) {
  return (
    <div className="flex space-x-2">
      {!isPrioritized ? (
        <button
          onClick={() => onAddToPriority(orderId)}
          className="p-1 text-gray-400 hover:text-blue-600 rounded"
          title="Add to priority list"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      ) : (
        <div className="p-1 text-yellow-500" title="In priority list">
          <Star className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}