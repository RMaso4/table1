// src/components/RoleLegend.tsx
import React from 'react';
import { Role } from '@prisma/client';
import { Info } from 'lucide-react';
import RoleIndicator from '@/components/Roleindicator';

interface RoleLegendProps {
  showDivider?: boolean;
}

export default function RoleLegend({ showDivider = true }: RoleLegendProps) {
  const roles: Role[] = ['BEHEERDER', 'PLANNER', 'SALES', 'SCANNER'];

  return (
    <div className={`flex items-center text-sm text-gray-500 dark:text-gray-400 ${showDivider ? 'border-l pl-4 ml-4 border-gray-200 dark:border-gray-700' : ''}`}>
      <Info className="h-4 w-4 mr-2" />
      <span className="mr-2">Editable by:</span>
      <div className="flex gap-3">
        {roles.map(role => (
          <div key={role} className="flex items-center gap-1">
            <RoleIndicator roles={[role]} size="sm" />
            <span className="text-xs">{role.charAt(0) + role.slice(1).toLowerCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}