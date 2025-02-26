// hooks/usePermissions.ts
import { useEffect, useState } from 'react';
import { Role } from '@prisma/client';

interface ColumnPermission {
  column: string;
  canEdit: boolean;
  canView: boolean;
}

export const usePermissions = (userRole: Role | undefined) => {
  const [permissions, setPermissions] = useState<ColumnPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/permissions');
        const data = await response.json();
        setPermissions(data);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userRole) {
      fetchPermissions();
    }
  }, [userRole]);

  const canEditColumn = (column: string): boolean => {
    if (!userRole || loading) return false;
    const permission = permissions.find(p => p.column === column);
    return permission?.canEdit ?? false;
  };

  const canViewColumn = (column: string): boolean => {
    if (!userRole || loading) return true; // Default to viewable
    const permission = permissions.find(p => p.column === column);
    return permission?.canView ?? true;
  };

  return {
    canEditColumn,
    canViewColumn,
    loading,
  };
};