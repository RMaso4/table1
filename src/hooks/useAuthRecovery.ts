// src/hooks/useAuthRecovery.ts
'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

/**
 * This hook attempts to recover a session if one auth method has a valid session
 * but the other doesn't. It helps keep both auth methods in sync.
 */
export function useAuthRecovery() {
  const { data: session, status, update } = useSession();
  const [recovering, setRecovering] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);

  useEffect(() => {
    const attemptRecovery = async () => {
      if (recovering || recoveryAttempted) return;

      try {
        // Only attempt recovery if NextAuth session is missing but custom token exists
        const hasCustomToken = document.cookie.includes('token=');

        if (!session && hasCustomToken && status !== 'loading') {
          console.log('Session recovery: Detected custom token without NextAuth session');
          setRecovering(true);

          // Check auth status with the server
          const authCheck = await fetch('/api/auth/check');
          const authStatus = await authCheck.json();

          // If custom token is valid but NextAuth session isn't, try to recover
          if (authStatus.customToken.valid && !authStatus.nextAuth.authenticated) {
            console.log('Session recovery: Attempting to recover session');

            // Use credential-less sign-in to refresh session based on cookie
            await signIn('credentials', { redirect: false });
            await update(); // Force session update

            console.log('Session recovery: Recovery attempt complete');
          }
        }
      } catch (error) {
        console.error('Session recovery failed:', error);
      } finally {
        setRecovering(false);
        setRecoveryAttempted(true);
      }
    };

    attemptRecovery();
  }, [session, status, recovering, recoveryAttempted, update]);

  return { recovering, recoveryAttempted };
}