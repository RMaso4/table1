// src/components/LockIndicator.tsx
import React from 'react';
import { Lock, Unlock } from 'lucide-react';

interface LockIndicatorProps {
  isLocked: boolean;
  onChange?: (newValue: boolean) => Promise<void>;
  disabled?: boolean;
}

export default function LockIndicator({
  isLocked,
  onChange,
  disabled = false
}: LockIndicatorProps) {
  const handleToggle = async () => {
    if (disabled || !onChange) return;

    try {
      await onChange(!isLocked);
    } catch (error) {
      console.error('Failed to toggle lock status:', error);
    }
  };

  return (
    <div className="flex items-center">
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`
          p-1.5 rounded-full transition-colors
          ${isLocked
            ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
            : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isLocked ? 'Order is locked (click to unlock)' : 'Order is unlocked (click to lock)'}
        aria-label={isLocked ? 'Unlock order' : 'Lock order'}
      >
        {isLocked ? (
          <Lock className="h-4 w-4" />
        ) : (
          <Unlock className="h-4 w-4" />
        )}
      </button>
      <span className="ml-2 text-sm">
        {isLocked ? 'Locked' : 'Available'}
      </span>
    </div>
  );
}