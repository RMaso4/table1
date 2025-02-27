// src/app/add-page/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ChevronLeft, Save, Check } from 'lucide-react';

// Define the column definition type
interface ColumnDefinition {
  field: string;
  title: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

// Define the custom page type
interface CustomPage {
  id: string;
  name: string;
  path: string;
  columns: string[];
}

export default function AddPage() {
  const router = useRouter();
  const [pageName, setPageName] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<ColumnDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load available columns on component mount
  useEffect(() => {
    // This would typically come from an API, but for now we'll define them here
    const columns: ColumnDefinition[] = [
      { field: 'aanmaak_datum', title: 'Aanmaak Datum', type: 'date' },
      { field: 'verkoop_order', title: 'Order #', type: 'text' },
      { field: 'project', title: 'Project', type: 'text' },
      { field: 'pos', title: 'Pos', type: 'number' },
      { field: 'type_artikel', title: 'Type Artikel', type: 'text' },
      { field: 'debiteur_klant', title: 'Debiteur Klant', type: 'text' },
      { field: 'material', title: 'Material', type: 'text' },
      { field: 'kantenband', title: 'Kantenband', type: 'text' },
      { field: 'kleur', title: 'Kleur', type: 'text' },
      { field: 'height', title: 'Height', type: 'number' },
      { field: 'db_waarde', title: 'DB Waarde', type: 'number' },
      { field: 'opmerking', title: 'Opmerkingen', type: 'text' },
      { field: 'productie_datum', title: 'Productie Datum', type: 'date' },
      { field: 'lever_datum', title: 'Lever Datum', type: 'date' },
      { field: 'bruto_zagen', title: 'Bruto Zagen', type: 'date' },
      { field: 'pers', title: 'Pers', type: 'date' },
      { field: 'netto_zagen', title: 'Netto Zagen', type: 'date' },
      { field: 'verkantlijmen', title: 'Verkantlijmen', type: 'date' },
      { field: 'boards', title: 'Boards', type: 'boolean' },
      { field: 'frames', title: 'Frames', type: 'boolean' },
      { field: 'totaal_boards', title: 'Totaal Boards', type: 'number' },
      { field: 'inkoopordernummer', title: 'Inkoopordernummer', type: 'text' },
      { field: 'updatedAt', title: 'Updated At', type: 'date' }
    ];
    setAvailableColumns(columns);
    
    // Select some default columns
    setSelectedColumns(['verkoop_order', 'project', 'debiteur_klant', 'material', 'lever_datum']);
  }, []);

  const handleToggleColumn = (field: string) => {
    setSelectedColumns(prev => {
      // If it's already selected, remove it
      if (prev.includes(field)) {
        return prev.filter(f => f !== field);
      } 
      // Otherwise add it
      return [...prev, field];
    });
  };

  const handleSelectAll = () => {
    if (selectedColumns.length === availableColumns.length) {
      // If all are selected, deselect all
      setSelectedColumns([]);
    } else {
      // Otherwise select all
      setSelectedColumns(availableColumns.map(col => col.field));
    }
  };

  const validateForm = (): boolean => {
    // Reset error
    setError(null);
    
    // Validate page name
    if (!pageName.trim()) {
      setError('Please enter a page name');
      return false;
    }
    
    // Check if at least one column is selected
    if (selectedColumns.length === 0) {
      setError('Please select at least one column');
      return false;
    }
    
    // Check if name is already used
    const existingPages = JSON.parse(localStorage.getItem('customPages') || '[]');
    if (existingPages.some((page: CustomPage) => page.name.toLowerCase() === pageName.toLowerCase())) {
      setError('A page with this name already exists');
      return false;
    }
    
    return true;
  };

  const handleSave = () => {
    // Validate the form
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      // Generate a unique ID and path
      const id = `custom-${Date.now()}`;
      const path = `/custom/${id}`;
      
      // Create the new page object
      const newPage: CustomPage = {
        id,
        name: pageName,
        path,
        columns: selectedColumns
      };
      
      // Retrieve existing pages from localStorage
      const existingPages = JSON.parse(localStorage.getItem('customPages') || '[]');
      
      // Add the new page
      const updatedPages = [...existingPages, newPage];
      
      // Save back to localStorage
      localStorage.setItem('customPages', JSON.stringify(updatedPages));
      
      // Navigate back to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving custom page:', error);
      setError('Failed to save custom page');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Navbar />
      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        <div className="p-8 flex-grow overflow-auto">
          <div className="mb-6 flex items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="mr-4 p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold">Create Custom Page</h1>
          </div>
          
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="mb-6">
              <label htmlFor="pageName" className="block text-sm font-medium text-gray-700 mb-2">
                Page Name
              </label>
              <input
                id="pageName"
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter page name"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Select Columns</h2>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedColumns.length === availableColumns.length 
                    ? 'Deselect All' 
                    : 'Select All'}
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {availableColumns.map((column) => (
                  <div 
                    key={column.field}
                    className={`
                      p-3 border rounded-md cursor-pointer flex justify-between items-center
                      ${selectedColumns.includes(column.field) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'}
                    `}
                    onClick={() => handleToggleColumn(column.field)}
                  >
                    <div>
                      <p className="font-medium">{column.title}</p>
                      <p className="text-xs text-gray-500">{column.type}</p>
                    </div>
                    {selectedColumns.includes(column.field) && (
                      <Check className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-700 mr-4"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`
                flex items-center px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
                ${saving ? 'opacity-75 cursor-not-allowed' : ''}
              `}
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Page
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}