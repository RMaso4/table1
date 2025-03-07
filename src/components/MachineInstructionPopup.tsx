// src/components/MachineInstructionPopup.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MachineInstructionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  instruction: string | null;
  orderNumber: string;
  onProceed: () => void;
  onUpdateInstruction?: (newInstruction: string) => Promise<void>;
  canEdit: boolean;
}

export default function MachineInstructionPopup({
  isOpen,
  onClose,
  title,
  instruction,
  orderNumber,
  onProceed,
  onUpdateInstruction,
  canEdit = false
}: MachineInstructionPopupProps) {
  const [editMode, setEditMode] = useState(false);
  const [instructionText, setInstructionText] = useState(instruction || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when the instruction prop changes
  useEffect(() => {
    setInstructionText(instruction || '');
  }, [instruction]);

  if (!isOpen) return null;

  const handleSaveInstruction = async () => {
    if (!onUpdateInstruction) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      await onUpdateInstruction(instructionText);
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save instruction:', error);
      setError(error instanceof Error ? error.message : 'Failed to update instruction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {title} - Order {orderNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {editMode ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Edit Instructions:
              </label>
              <textarea
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={5}
                placeholder="Enter instructions for this machine action..."
                disabled={isSubmitting}
              />
              {error && (
                <div className="text-sm text-red-500 dark:text-red-400">{error}</div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4">
              {instruction ? (
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-line">{instruction}</p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  No special instructions for this machine action.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <div>
              {canEdit && !editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md"
                >
                  {instruction ? 'Edit Instructions' : 'Add Instructions'}
                </button>
              )}
              {canEdit && editMode && (
                <div className="space-x-2">
                  <button
                    onClick={handleSaveInstruction}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setInstructionText(instruction || '');
                      setError(null);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onProceed}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}