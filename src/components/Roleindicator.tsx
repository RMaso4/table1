// src/components/RoleIndicator.tsx
import React from 'react';
import { Role } from '@prisma/client';
import Tooltip from './Tooltip';

interface RoleIndicatorProps {
  roles: Role[];
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

// Role color mapping
const roleColors: Record<Role, string> = {
  PLANNER: 'bg-blue-500',
  BEHEERDER: 'bg-purple-500',
  SALES: 'bg-green-500',
  SCANNER: 'bg-amber-500',
  GENERAL_ACCESS: 'bg-gray-500'
};

// Role dot CSS classes
const roleDotClasses: Record<Role, string> = {
  PLANNER: 'role-dot role-dot-planner',
  BEHEERDER: 'role-dot role-dot-beheerder',
  SALES: 'role-dot role-dot-sales',
  SCANNER: 'role-dot role-dot-scanner',
  GENERAL_ACCESS: 'role-dot'
};

// Role full names for the tooltips
const roleNames: Record<Role, string> = {
  PLANNER: 'Planner',
  BEHEERDER: 'Beheerder (Admin)',
  SALES: 'Sales',
  SCANNER: 'Scanner',
  GENERAL_ACCESS: 'General Access'
};

export default function RoleIndicator({
  roles,
  showLabel = false,
  size = 'sm',
  animate = false
}: RoleIndicatorProps) {
  // Size classes for different sizes
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  // Don't render anything if no roles are provided
  if (!roles || roles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {roles.map((role) => (
        <Tooltip
          key={role}
          content={`${roleNames[role]} can edit this field`}
          position="top"
        >
          <div className="flex items-center gap-1">
            <div
              className={`
                ${roleColors[role]} 
                ${sizeClasses[size]} 
                rounded-full inline-block
                ${animate ? roleDotClasses[role] : ''}
              `}
            >
              <span className="sr-only">{role} can edit this field</span>
            </div>
            {showLabel && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {role.charAt(0)}
              </span>
            )}
          </div>
        </Tooltip>
      ))}
    </div>
  );
}