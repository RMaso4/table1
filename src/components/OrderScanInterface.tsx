// src/components/OrderScanInterface.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Check } from 'lucide-react';
import MachineInstructionPopup from './MachineInstructionPopup';

interface Order {
  id: string;
  verkoop_order: string;
  project: string | null;
  debiteur_klant: string;
  type_artikel: string;
  material: string;
  bruto_zagen: string | null;
  pers: string | null;
  netto_zagen: string | null;
  verkantlijmen: string | null;
  cnc_start_datum: string | null;
  pmt_start_datum: string | null;
  slotje: boolean;
  // Popup text fields
  popup_text_bruto_zagen: string | null;
  popup_text_pers: string | null;
  popup_text_netto_zagen: string | null;
  popup_text_verkantlijmen: string | null;
  popup_text_cnc: string | null;
  popup_text_pmt: string | null;
  popup_text_lakkerij: string | null;
  popup_text_inpak: string | null;
  popup_text_rail: string | null;
  popup_text_assemblage: string | null;
}

interface MachineAction {
  name: string;
  field: keyof Order;
  label: string;
  textField: keyof Order;
}

const machineActions: MachineAction[] = [
  { name: 'start_zaag', field: 'bruto_zagen', label: 'Start Zaag', textField: 'popup_text_bruto_zagen' },
  { name: 'start_pers', field: 'pers', label: 'Start Pers', textField: 'popup_text_pers' },
  { name: 'start_netto', field: 'netto_zagen', label: 'Start Netto Zaag', textField: 'popup_text_netto_zagen' },
  { name: 'start_verkant', field: 'verkantlijmen', label: 'Start Verkantlijmen', textField: 'popup_text_verkantlijmen' },
  { name: 'start_cnc', field: 'cnc_start_datum', label: 'Start CNC', textField: 'popup_text_cnc' },
  { name: 'start_pmt', field: 'pmt_start_datum', label: 'Start PMT', textField: 'popup_text_pmt' },
];

const OrderScanInterface = () => {
  const { data: session } = useSession();
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<MachineAction | null>(null);
  const [showInstructionPopup, setShowInstructionPopup] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if user is a planner or admin (can edit instructions)
  const canEditInstructions = 
    session?.user?.role === 'PLANNER' || 
    session?.user?.role === 'BEHEERDER';

  useEffect(() => {
    // Focus the input field when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleScan = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/orders/scan/${orderNumber}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch order');
      }

      setOrder(data);
      setOrderNumber('');
      
      // Re-focus the input field after successful scan
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMachineAction = async (action: MachineAction) => {
    setConfirmAction(action);
    setShowInstructionPopup(true);
  };

  const updateInstructionText = async (newText: string) => {
    if (!order || !confirmAction) return;
  
    try {
      // Update the instruction text in the database
      const textField = confirmAction.textField;
      
      // Use the dedicated popup-instructions endpoint
      const response = await fetch(`/api/orders/${order.id}/popup-instructions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ field: textField, value: newText }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update instruction text');
      }
  
      // Update local order state
      const updatedOrder = {
        ...order,
        [textField]: newText
      };
      setOrder(updatedOrder);
  
      // Show success message
      setSuccess('Instructions updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update instructions');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Add a function to refresh order data after updates
  const refreshOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/scan/${order?.verkoop_order}`);
      
      if (!response.ok) {
        throw new Error('Failed to refresh order data');
      }
      
      const updatedOrder = await response.json();
      setOrder(updatedOrder);
    } catch (error) {
      console.error('Error refreshing order:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Then modify the confirmMachineAction function to refresh the order data after action:
  const confirmMachineAction = async () => {
    if (!order || !confirmAction) return;
    setShowInstructionPopup(false);
  
    setLoading(true);
    setError(null);
    setSuccess(null);
  
    try {
      const response = await fetch(`/api/orders/${order.id}/machine-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: confirmAction.name, field: confirmAction.field }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update machine action');
      }
  
      // Update local state with the response data
      setOrder(data);
      setSuccess(`Successfully started ${confirmAction.label}`);
      
      // Refresh order data after a short delay to ensure we have the latest data
      setTimeout(() => refreshOrder(order.id), 1000);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setConfirmAction(null);
      
      // Re-focus the input field after action
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Close popup without taking action
  const closeInstructionPopup = () => {
    setShowInstructionPopup(false);
    setConfirmAction(null);
    
    // Re-focus the input field
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Toggle slotje status
  const toggleSlotje = async () => {
    if (!order) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slotje: !order.slotje }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update slotje status');
      }

      setOrder({
        ...order,
        slotje: !order.slotje,
      });
      
      setSuccess(`Slotje ${order.slotje ? 'removed' : 'applied'} successfully`);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Scan Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Scan Order</h2>
          <form onSubmit={handleScan} className="space-y-4">
            <div className="flex gap-4">
              <input
                ref={inputRef}
                id="orderInput"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Scan or enter order number"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !orderNumber}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Scan'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4 rounded flex items-center">
            <Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
            <p className="text-green-700 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Order Details */}
        {order && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Order Details</h2>
              
              {/* Slotje toggle button */}
              <button
                onClick={toggleSlotje}
                disabled={loading}
                className={`
                  px-4 py-2 rounded-md flex items-center gap-2 
                  ${order.slotje 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'}
                `}
              >
                <span>
                  {order.slotje ? 'Remove Lock' : 'Apply Lock'}
                </span>
                <span>
                  {order.slotje ? '🔓' : '🔒'}
                </span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Number</p>
                <p className="text-lg text-gray-900 dark:text-gray-100">{order.verkoop_order}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Project</p>
                <p className="text-lg text-gray-900 dark:text-gray-100">{order.project || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</p>
                <p className="text-lg text-gray-900 dark:text-gray-100">{order.debiteur_klant}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Article Type</p>
                <p className="text-lg text-gray-900 dark:text-gray-100">{order.type_artikel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Material</p>
                <p className="text-lg text-gray-900 dark:text-gray-100">{order.material}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                <p className="text-lg text-gray-900 dark:text-gray-100 flex items-center">
                  {order.slotje ? (
                    <span className="text-red-500 flex items-center">
                      <span className="mr-2">🔒</span> Locked
                    </span>
                  ) : (
                    <span className="text-green-500 flex items-center">
                      <span className="mr-2">✓</span> Available
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Machine Actions */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Machine Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                {machineActions.map((action) => (
                  <button 
                    key={action.name}
                    onClick={() => handleMachineAction(action)}
                    disabled={loading || !!order[action.field] || order.slotje}
                    className={`
                      w-full px-4 py-3 rounded-md text-left transition-colors
                      ${order[action.field]
                        ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                        : order.slotje
                          ? 'bg-red-50 dark:bg-red-900/20 cursor-not-allowed border border-red-300 dark:border-red-700'
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'}
                      disabled:opacity-50
                    `}
                  >
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                      {action.label}
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {order[action.field] && typeof order[action.field] === 'string'
                        ? new Date(order[action.field] as string).toLocaleString()
                        : 'Not started'}
                    </span>
                    {order[action.textField] && !order[action.field] && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 block">
                        Has instructions ℹ️
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Machine Instructions Popup */}
        {confirmAction && (
          <MachineInstructionPopup
            isOpen={showInstructionPopup}
            onClose={closeInstructionPopup}
            title={`${confirmAction.label} Instructions`}
            instruction={order?.[confirmAction.textField]?.toString() || null}
            orderNumber={order?.verkoop_order || ''}
            onProceed={confirmMachineAction}
            onUpdateInstruction={canEditInstructions ? updateInstructionText : undefined}
            canEdit={canEditInstructions}
          />
        )}
      </div>
    </div>
  );
};

export default OrderScanInterface;