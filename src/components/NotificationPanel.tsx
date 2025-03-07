// src/components/NotificationPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Trash2, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { pusherClient, CHANNELS, EVENTS } from '@/lib/pusher';
import { REALTIME_CONFIG } from '@/lib/socketConfig';
import { formatDateTime } from '@/utils/settingsUtils';
import useSettings from '@/hooks/useSettings';

interface Notification {
  id: string;
  message: string;
  orderId: string;
  userId: string;
  read: boolean;
  createdAt: string;
  user?: {
    name: string | null;
    email: string;
  };
  order?: {
    verkoop_order: string;
  };
}

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Simple confirmation dialog component
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Confirm Action</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-800 dark:text-gray-200"
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
};

export default function NotificationPanel() {
  const { userSettings } = useSettings();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const notificationPanelRef = useRef<HTMLDivElement>(null);

  // Keep track of processed notification IDs to prevent duplicates
  const processedNotificationsRef = useRef<Set<string>>(new Set());
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // Multi-select and deletion state
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    notificationIds: [] as string[],
  });
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Check if notifications are enabled in user settings
  const notificationsEnabled = userSettings.showNotifications !== false;

  // Close popup when pressing Escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen]);

  useEffect(() => {
    // Skip if notifications are disabled in user settings
    if (!notificationsEnabled || !session?.user || !REALTIME_CONFIG.USE_PUSHER) return;

    const channel = pusherClient.subscribe(CHANNELS.NOTIFICATIONS);

    channel.bind(EVENTS.NOTIFICATION_NEW, (notification: Notification) => {
      // Enhanced deduplication logic
      // Create a unique identifier that includes timestamp to minute precision
      const notificationKey = notification.id;
      const timestamp = new Date(notification.createdAt).toISOString().slice(0, 16); // To minutes
      const contentKey = `${notification.orderId}:${notification.message}:${notification.userId}:${timestamp}`;

      // Add debug logging
      if (REALTIME_CONFIG.DEBUG) {
        console.log('Notification received:', { id: notification.id, contentKey });
      }

      // Skip duplicates (check both ID and content)
      if (processedNotificationsRef.current.has(notificationKey)) {
        if (REALTIME_CONFIG.DEBUG) {
          console.log('NotificationPanel: Skipping duplicate notification ID:', notificationKey);
        }
        return;
      }

      if (processedMessagesRef.current.has(contentKey)) {
        if (REALTIME_CONFIG.DEBUG) {
          console.log('NotificationPanel: Skipping duplicate notification content:', contentKey);
        }
        return;
      }

      // Check against current notifications state to prevent logical duplicates
      let isDuplicate = false;
      setNotifications(prev => {
        isDuplicate = prev.some(n =>
          n.id === notification.id ||
          (n.orderId === notification.orderId &&
            n.message === notification.message &&
            n.userId === notification.userId &&
            // Check if timestamps are within 1 minute of each other
            Math.abs(new Date(n.createdAt).getTime() - new Date(notification.createdAt).getTime()) < 60000)
        );

        if (isDuplicate) return prev;

        // Mark as processed
        processedNotificationsRef.current.add(notificationKey);
        processedMessagesRef.current.add(contentKey);

        // Schedule cleanup to prevent memory leaks
        setTimeout(() => {
          processedNotificationsRef.current.delete(notificationKey);
        }, 300000); // 5 minutes

        setTimeout(() => {
          processedMessagesRef.current.delete(contentKey);
        }, 60000); // 1 minute

        // Update unread count
        setUnreadCount(count => count + 1);

        // Show notification toast
        showNotificationToast(notification);

        // Add to list
        return [notification, ...prev];
      });

      // If we determined it was a duplicate, don't process further
      if (isDuplicate && REALTIME_CONFIG.DEBUG) {
        console.log('NotificationPanel: Duplicate notification detected in existing state');
      }
    });

    // Clean up
    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(CHANNELS.NOTIFICATIONS);
    };
  }, [session, notificationsEnabled]);

  // Fetch notifications on initial load
  useEffect(() => {
    // Only fetch if notifications are enabled and user is authenticated
    if (notificationsEnabled && session?.user) {
      fetchNotifications();
    }
  }, [session, notificationsEnabled]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();

      // Clear duplicate tracking sets
      processedNotificationsRef.current.clear();
      processedMessagesRef.current.clear();

      // Detect and remove duplicates in the initial data
      const uniqueNotifications: Notification[] = [];
      const processedIds = new Set<string>();
      const processedContentKeys = new Set<string>();

      data.forEach((notification: Notification) => {
        // Skip duplicates by ID
        if (processedIds.has(notification.id)) {
          return;
        }

        // Create content key to detect semantic duplicates
        const contentKey = `${notification.orderId}:${notification.message}:${notification.userId}`;
        if (processedContentKeys.has(contentKey)) {
          return;
        }

        // Add to unique list and mark as processed
        uniqueNotifications.push(notification);
        processedIds.add(notification.id);
        processedContentKeys.add(contentKey);

        // Add to our refs for future duplicate checking
        processedNotificationsRef.current.add(notification.id);
        processedMessagesRef.current.add(contentKey);
      });

      setNotifications(uniqueNotifications);
      setUnreadCount(uniqueNotifications.filter((n: Notification) => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: true }),
      });

      if (!response.ok) throw new Error('Failed to mark notification as read');

      // Update local state
      setNotifications(prev => prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      ));

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);

    for (const notification of unreadNotifications) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error(`Failed to mark notification ${notification.id} as read:`, error);
      }
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      // Update local state - remove the notification from the UI
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

      // Update unread count if needed
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const deleteMultipleNotifications = async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;

    try {
      const response = await fetch('/api/notifications/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: notificationIds }),
      });

      if (!response.ok) throw new Error('Failed to delete notifications');

      // Update local state
      setNotifications(prev =>
        prev.filter(notification => !notificationIds.includes(notification.id))
      );

      // Update unread count
      const deletedUnreadCount = notifications.filter(
        n => !n.read && notificationIds.includes(n.id)
      ).length;

      if (deletedUnreadCount > 0) {
        setUnreadCount(prev => Math.max(0, prev - deletedUnreadCount));
      }

      // Clear selection
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Failed to delete notifications:', error);
    }
  };

  const confirmDeleteNotification = (notificationId: string) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to delete this notification?',
      notificationIds: [notificationId],
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedNotifications.size === 0) return;

    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to delete ${selectedNotifications.size} notification(s)?`,
      notificationIds: Array.from(selectedNotifications),
    });
  };

  const handleConfirmDelete = () => {
    if (confirmDialog.notificationIds.length === 1) {
      deleteNotification(confirmDialog.notificationIds[0]);
    } else {
      deleteMultipleNotifications(confirmDialog.notificationIds);
    }

    setConfirmDialog({ isOpen: false, message: '', notificationIds: [] });
  };

  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(notificationId)) {
        newSelection.delete(notificationId);
      } else {
        newSelection.add(notificationId);
      }
      return newSelection;
    });
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      // Deselect all
      setSelectedNotifications(new Set());
    } else {
      // Select all
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    }
  };

  const showNotificationToast = (notification: Notification) => {
    // Only show if permission is granted and document is hidden (user in another tab/window)
    if (Notification && Notification.permission === 'granted' && document.hidden) {
      const title = 'New Order Update';
      const body = notification.message;
      new Notification(title, { body });
    }
  };

  // Request notification permission
  useEffect(() => {
    if (Notification && Notification.permission === 'default' && notificationsEnabled) {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  const formatTime = (dateString: string) => {
    // Use the utility function that respects user settings
    return formatDateTime(new Date(dateString), userSettings);
  };

  // Close popup when clicking outside the content
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Clear selections when exiting selection mode
      setSelectedNotifications(new Set());
    }
  };

  // If notifications are disabled in user settings, don't show the panel
  if (!notificationsEnabled) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white"
        aria-label="Open notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popup Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Popup Content */}
          <div
            ref={notificationPanelRef}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col animate-fadeIn"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close notifications"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Actions Toolbar */}
            {notifications.length > 0 && (
              <div className="border-b border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={toggleSelectionMode}
                    className={`px-3 py-1 text-xs rounded-md ${isSelectionMode
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    {isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
                  </button>

                  {isSelectionMode && (
                    <>
                      <button
                        onClick={toggleSelectAll}
                        className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md"
                      >
                        {selectedNotifications.size === notifications.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>

                      {selectedNotifications.size > 0 && (
                        <button
                          onClick={confirmDeleteSelected}
                          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete ({selectedNotifications.size})</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                {unreadCount > 0 && !isSelectionMode && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            )}

            <div className="overflow-y-auto flex-grow">
              {isLoading ? (
                <div className="p-6 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <p>No notifications</p>
                  <p className="text-sm mt-2">You&apos;ll see updates here when there&apos;s activity.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                    >
                      <div className="flex items-start">
                        {/* Selection checkbox */}
                        {isSelectionMode && (
                          <div
                            className="mr-3 mt-1"
                            onClick={() => toggleSelection(notification.id)}
                          >
                            <div className={`h-5 w-5 rounded border ${selectedNotifications.has(notification.id)
                                ? 'bg-blue-600 border-blue-600 flex items-center justify-center'
                                : 'border-gray-300 dark:border-gray-600'
                              }`}>
                              {selectedNotifications.has(notification.id) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notification content */}
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => !isSelectionMode && !notification.read && markAsRead(notification.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm text-gray-800 dark:text-gray-200">{notification.message}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatTime(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.read && (
                              <span className="h-2 w-2 bg-blue-500 rounded-full mt-1 flex-shrink-0 ml-2"></span>
                            )}
                          </div>
                        </div>

                        {/* Delete button */}
                        {!isSelectionMode && (
                          <button
                            onClick={() => confirmDeleteNotification(notification.id)}
                            className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, message: '', notificationIds: [] })}
      />
    </div>
  );
}