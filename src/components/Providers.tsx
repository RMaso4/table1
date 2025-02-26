// components/Providers.tsx
'use client';

import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from 'react';

// Custom provider that handles session synchronization
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
        for (const cookie of cookies) { // Changed 'let' to 'const'
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

  // Configure the session provider with more aggressive settings
  return (
    <SessionProvider 
      // Force session refresh on mount
      refetchOnWindowFocus={true}
      // Check session more frequently
      refetchInterval={5 * 60} // 5 minutes
      // Don't reuse stale sessions
      refetchWhenOffline={false}
    >
      {mounted ? children : null}
    </SessionProvider>
  );
}