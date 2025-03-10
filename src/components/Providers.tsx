// src/components/Providers.tsx
'use client';

import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from 'react';
import { SettingsProvider } from './SettingsProvider';
import { TableSettingsProvider } from './TableSettingsProvider';

// Enhanced provider with all app providers
export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Only render children after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug authentication state on the client side
  useEffect(() => {
    if (mounted) {
      // Helper to check for cookies
      const getCookie = (name: string) => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [cookieName, cookieValue] = cookie.trim().split('=');
          if (cookieName === name) {
            return cookieValue;
          }
        }
        return null;
      };

      // Log authentication status
      const hasNextAuthCookie = getCookie('next-auth.session-token') || 
                               getCookie('__Secure-next-auth.session-token');
      const hasCustomToken = getCookie('token');

      console.log('[Auth Provider] Authentication check:');
      console.log(`- NextAuth token: ${hasNextAuthCookie ? 'Present' : 'Missing'}`);
      console.log(`- Custom token: ${hasCustomToken ? 'Present' : 'Missing'}`);
    }
  }, [mounted]);

  return (
    <SessionProvider 
      refetchOnWindowFocus={true}
      refetchInterval={5 * 60} // 5 minutes
      refetchWhenOffline={false}
    >
      <SettingsProvider>
        <TableSettingsProvider>
          {mounted ? children : null}
        </TableSettingsProvider>
      </SettingsProvider>
    </SessionProvider>
  );
}