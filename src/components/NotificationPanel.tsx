// src/components/NotificationPanel.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { pusherClient, CHANNELS, EVENTS } from '@/lib/pusher';

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

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  
  // Keep track of processed notification IDs to prevent duplicates
  const processedNotificationsRef = useRef<Set<string>>(new Set());

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle new notifications via Pusher
  useEffect(() => {
    if (!session?.user) return;
    
    const channel = pusherClient.subscribe(CHANNELS.NOTIFICATIONS);
    
    channel.bind(EVENTS.NOTIFICATION_NEW, (notification: Notification) => {
      // Check if we've already processed this notification
      if (processedNotificationsRef.current.has(notification.id)) {
        console.log('Skipping duplicate notification:', notification.id);
        return;
      }
      
      console.log('New notification received via Pusher:', notification);
      
      // Mark as processed
      processedNotificationsRef.current.add(notification.id);
      
      setNotifications(prev => {
        // Double-check again (in case notification arrived multiple times rapidly)
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        
        // Add new notification at the beginning
        const updated = [notification, ...prev];
        
        // Update unread count
        setUnreadCount(count => count + 1);
        
        // Show notification toast
        showNotificationToast(notification);
        
        return updated;
      });
    });

    // Clean up
    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(CHANNELS.NOTIFICATIONS);
    };
  }, [session]);

  // Fetch notifications on initial load
  useEffect(() => {
    // Only fetch if user is authenticated
    if (session?.user) {
      fetchNotifications();
    }
  }, [session]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      
      // Add all fetched notification IDs to our processed set
      data.forEach((notification: Notification) => {
        processedNotificationsRef.current.add(notification.id);
      });
      
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
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
    if (Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  return (
    <div className="relative" ref={notificationPanelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg overflow-hidden z-50 transform -translate-x-3/4 md:-translate-x-1/2 lg:-translate-x-1/4">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="text-xs text-gray-500">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="h-2 w-2 bg-blue-500 rounded-full mt-1"></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-2 border-t border-gray-200 text-center">
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}