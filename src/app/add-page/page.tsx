// src/app/add-page/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import { ChevronLeft, Save, Trash2, AlertCircle, Check } from 'lucide-react';

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
  columns: string[];
  createdBy: string;
  createdAt: string;
}

// Confirmation dialog component
function DeleteConfirmationDialog({ 
  isOpen, 
  pageName, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean; 
  pageName: string; 
  onConfirm: () => void; 
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Page</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the page &quot;{pageName}&quot;? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pageName, setPageName] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<ColumnDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [existingPages, setExistingPages] = useState<CustomPage[]>([]);
  const [deletingPage, setDeletingPage] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<CustomPage | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Check if user is authorized (must be beheerder)
  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role !== 'BEHEERDER') {
        setUnauthorized(true);
        
        // Redirect after showing unauthorized message
        const timer = setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session, status, router]);

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
      { field: 'boards', title: 'Boards', type: 'text' },
      { field: 'frames', title: 'Frames', type: 'text' },
      { field: 'totaal_boards', title: 'Totaal Boards', type: 'number' },
      { field: 'inkoopordernummer', title: 'Inkoopordernummer', type: 'text' },
      { field: 'updatedAt', title: 'Updated At', type: 'date' }
    ];
    setAvailableColumns(columns);
    
    // Select some default columns
    setSelectedColumns(['verkoop_order', 'project', 'debiteur_klant', 'material', 'lever_datum']);
  }, []);

  // Fetch existing custom pages
  useEffect(() => {
    const fetchExistingPages = async () => {
      try {
        const response = await fetch('/api/custom-pages');
        if (response.ok) {
          const data = await response.json();
          setExistingPages(data);
        } else {
          console.error('Failed to fetch custom pages');
        }
      } catch (error) {
        console.error('Error fetching custom pages:', error);
      }
    };

    fetchExistingPages();
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
    
    return true;
  };

  const handleSave = async () => {
    // Validate the form
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      // Create the new page via API
      const response = await fetch('/api/custom-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: pageName,
          columns: selectedColumns
        }),
      });
      
      // Parse the response
      const data = await response.json();
      
      // Handle errors
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save custom page');
      }
      
      // On success, navigate back to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving custom page:', error);
      setError(error instanceof Error ? error.message : 'Failed to save custom page');
      setSaving(false);
    }
  };

  // Handle page deletion
  const deletePage = async (pageId: string) => {
    try {
      setDeletingPage(pageId);
      
      const response = await fetch('/api/custom-pages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: pageId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete page');
      }
      
      // Update the existing pages list
      setExistingPages(prevPages => prevPages.filter(page => page.id !== pageId));
      
      // Show success message
      setToast('Page deleted successfully');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Error deleting page:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete page');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingPage(null);
      setShowDeleteConfirmation(false);
      setPageToDelete(null);
    }
  };

  // Show unauthorized message
  if (unauthorized) {
    return (
      <div className="flex h-screen">
        <Navbar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded max-w-lg">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <h2 className="text-lg font-medium text-red-800">Unauthorized</h2>
            </div>
            <p className="mt-2 text-red-700">
              Only users with Beheerder role can create custom pages. Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex h-screen">
        <Navbar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Navbar />
      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        <div className="p-8 flex-grow overflow-auto">
          {toast && (
            <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow z-50">
              {toast}
            </div>
          )}
          
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
          
          {/* Existing Custom Pages Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Existing Custom Pages</h2>
            
            {existingPages.length > 0 ? (
              <div className="space-y-2">
                {existingPages.map(page => (
                  <div 
                    key={page.id} 
                    className="flex justify-between items-center p-3 border rounded-md hover:bg-gray-50"
                  >
                    <div>
                      <span className="font-medium">{page.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({page.columns.length} columns)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setPageToDelete(page);
                        setShowDeleteConfirmation(true);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                      title="Delete custom page"
                      disabled={deletingPage === page.id}
                    >
                      {deletingPage === page.id ? (
                        <span className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin inline-block"></span>
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No custom pages created yet.</p>
            )}
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
      
      {/* Delete Confirmation Dialog */}
      {pageToDelete && (
        <DeleteConfirmationDialog
          isOpen={showDeleteConfirmation}
          pageName={pageToDelete.name}
          onConfirm={() => deletePage(pageToDelete.id)}
          onCancel={() => {
            setShowDeleteConfirmation(false);
            setPageToDelete(null);
          }}
        />
      )}
    </div>
  );
}