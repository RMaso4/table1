// src/hooks/useTableSettings.ts
import { useEffect, useState } from 'react';
import useSettings from './useSettings';
import { SortState } from '@/types';

interface TableSettings {
  compact: boolean;
  pageSize: number;
  defaultSort: SortState;
  isLoading: boolean;
}

/**
 * Hook to provide table settings consistently across the application
 */
export default function useTableSettings(): TableSettings {
  const { userSettings, isLoading } = useSettings();
  const [tableSettings, setTableSettings] = useState<TableSettings>({
    compact: false,
    pageSize: 50,
    defaultSort: { field: 'lever_datum', direction: 'asc' },
    isLoading: true
  });

  // Update settings when user settings change
  useEffect(() => {
    if (!isLoading) {
      setTableSettings({
        compact: userSettings.tableCompactMode,
        pageSize: userSettings.defaultPageSize,
        defaultSort: {
          field: userSettings.defaultSortColumn,
          direction: userSettings.defaultSortDirection
        },
        isLoading: false
      });
    }
  }, [userSettings, isLoading]);

  return tableSettings;
}