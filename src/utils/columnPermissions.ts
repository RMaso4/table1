// src/utils/columnPermissions.ts
import { Role } from '@prisma/client';

// Define the roles that can edit specific columns
export const getEditableRoles = (field: string): Role[] => {
  // Fields that BEHEERDER and PLANNER can always edit
  const alwaysEditable: Role[] = ['BEHEERDER', 'PLANNER'];
  
  // Fields that SALES can edit
  const salesEditableFields = [
    'project', 
    'lever_datum', 
    'opmerking', 
    'inkoopordernummer'
  ];
  
  // Fields that SCANNER can edit
  const scannerEditableFields = [
    'bruto_zagen',
    'pers',
    'netto_zagen',
    'verkantlijmen', 
    'cnc_start_datum', 
    'pmt_start_datum'
  ];
  
  if (salesEditableFields.includes(field)) {
    return [...alwaysEditable, 'SALES'];
  }
  
  if (scannerEditableFields.includes(field)) {
    return [...alwaysEditable, 'SCANNER'];
  }
  
  // Default - only BEHEERDER and PLANNER can edit
  return alwaysEditable;
};

// Check if a specific role can edit a column
export const canRoleEditColumn = (role: Role, field: string): boolean => {
  const editableRoles = getEditableRoles(field);
  return editableRoles.includes(role);
};