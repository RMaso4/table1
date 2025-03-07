// src/components/InstructionsText.tsx
import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface InstructionTextProps {
  text: string | null;
  onChange?: (newText: string) => Promise<void>;
  title: string;
  canEdit?: boolean;
}

export default function InstructionText({
  text,
  onChange,
  title,
  canEdit = false
}: InstructionTextProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!onChange) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onChange(editText);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save instruction text:', error);
      setError(error instanceof Error ? error.message : 'Failed to update instructions');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!text && !canEdit) {
    return <span className="text-gray-400 dark:text-gray-500">-</span>;
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          disabled={isSubmitting}
        />
        {error && (
          <div className="text-xs text-red-500 dark:text-red-400">{error}</div>
        )}
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setEditText(text || '');
              setError(null);
            }}
            disabled={isSubmitting}
            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPreview(true)}
        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
      >
        <Info className="h-4 w-4" />
        <span className="text-sm">
          {text ? 'View instructions' : 'No instructions'}
        </span>
      </button>

      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              {text ? (
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md whitespace-pre-line">
                  {text}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No instructions provided.</p>
              )}
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 gap-2">
              {canEdit && (
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setIsEditing(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}