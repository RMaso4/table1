// src/hooks/useColumnResize.ts
'use client';

import { useState, useCallback, useRef } from 'react';

interface ColumnSizes {
  [key: string]: number;
}

export default function useColumnResize(initialSizes: ColumnSizes = {}) {
  const [columnSizes, setColumnSizes] = useState<ColumnSizes>(initialSizes);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleResizeStart = useCallback((columnId: string, startX: number, startWidth: number) => {
    setResizingColumn(columnId);
    startXRef.current = startX;
    startWidthRef.current = startWidth;
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return;
    
    const deltaX = e.clientX - startXRef.current;
    const newWidth = Math.max(100, startWidthRef.current + deltaX); // Minimum 100px
    
    setColumnSizes(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  }, [resizingColumn]);

  const handleResizeEnd = useCallback(() => {
    setResizingColumn(null);
    
    // Save column sizes to localStorage for persistence
    try {
      localStorage.setItem('columnSizes', JSON.stringify(columnSizes));
    } catch (error) {
      console.error('Failed to save column sizes:', error);
    }
  }, [columnSizes]);

  return {
    columnSizes,
    resizingColumn,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd
  };
}