import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';

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
}

interface MachineAction {
  name: string;
  field: keyof Order;
  label: string;
}

const machineActions: MachineAction[] = [
  { name: 'start_zaag', field: 'bruto_zagen', label: 'Start Zaag' },
  { name: 'start_pers', field: 'pers', label: 'Start Pers' },
  { name: 'start_netto', field: 'netto_zagen', label: 'Start Netto Zaag' },
  { name: 'start_verkant', field: 'verkantlijmen', label: 'Start Verkantlijmen' },
  { name: 'start_cnc', field: 'cnc_start_datum', label: 'Start CNC' },
  { name: 'start_pmt', field: 'pmt_start_datum', label: 'Start PMT' },
];

const OrderScanInterface = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<MachineAction | null>(null);

  useEffect(() => {
    const input = document.getElementById('orderInput');
    if (input) {
      input.focus();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMachineAction = async (action: MachineAction) => {
    setConfirmAction(action);
  };

  const confirmMachineAction = async () => {
    if (!order || !confirmAction) return;

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

      setOrder(data);
      setSuccess(`Successfully updated ${confirmAction.label}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const cancelConfirmation = () => {
    setConfirmAction(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Scan Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Scan Order</h2>
          <form onSubmit={handleScan} className="space-y-4">
            <div className="flex gap-4">
              <input
                id="orderInput"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Scan or enter order number"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Order Details */}
        {order && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Order Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Order Number</p>
                <p className="text-lg">{order.verkoop_order}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Project</p>
                <p className="text-lg">{order.project || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Customer</p>
                <p className="text-lg">{order.debiteur_klant}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Article Type</p>
                <p className="text-lg">{order.type_artikel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Material</p>
                <p className="text-lg">{order.material}</p>
              </div>
            </div>

            {/* Machine Actions */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Machine Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                {machineActions.map((action) => (
                  <button 
                    key={action.name}
                    onClick={() => handleMachineAction(action)}
                    disabled={loading || !!order[action.field]}
                    className={`
                      w-full px-4 py-3 rounded-md text-left transition-colors
                      ${order[action.field]
                        ? 'bg-gray-100 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-50 border border-gray-300'}
                      disabled:opacity-50
                    `}
                  >
                    <span className="block text-sm font-medium">
                      {action.label}
                    </span>
                    <span className="block text-sm text-gray-500 mt-1">
                      {order[action.field] 
                        ? new Date(order[action.field]!).toLocaleString()
                        : 'Not started'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Confirm Action</h3>
                <button
                  onClick={cancelConfirmation}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to start {confirmAction.label.toLowerCase()} for order {order?.verkoop_order}?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={cancelConfirmation}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMachineAction}
                  className="px-4 py-2 bg-blue-599 text-white rounded hover:bg-blue-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderScanInterface;