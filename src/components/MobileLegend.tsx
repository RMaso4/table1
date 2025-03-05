// src/components/MobileLegend.tsx
import React, { useState } from 'react';
import { Role } from '@prisma/client';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import RoleIndicator from '@/components/Roleindicator';

export default function MobileLegend() {
  const [isOpen, setIsOpen] = useState(false);
  const roles: Role[] = ['BEHEERDER', 'PLANNER', 'SALES', 'SCANNER'];
  
  return (
    <div className="md:hidden mt-2 bg-white dark:bg-gray-800 rounded-lg shadow p-3">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-300"
      >
        <div className="flex items-center">
          <Info className="h-4 w-4 mr-2" />
          <span>Column edit permissions</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      
      {isOpen && (
        <div className="mt-3 space-y-2 text-sm text-gray-500 dark:text-gray-400 border-t pt-2 border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-300">Colored dots indicate which roles can edit each column:</p>
          <div className="grid grid-cols-2 gap-3">
            {roles.map(role => (
              <div key={role} className="flex items-center gap-2">
                <RoleIndicator roles={[role]} size="md" />
                <span>{role.charAt(0) + role.slice(1).toLowerCase()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}