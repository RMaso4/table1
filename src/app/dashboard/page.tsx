// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardContent from '@/components/DashboardContent';

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [hasCustomToken, setHasCustomToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Check authentication on load
  useEffect(() => {
    // Check for custom token
    const checkToken = () => {
      const token = document.cookie.includes('token=');
      setHasCustomToken(token);
      return token;
    };

    // Only redirect if not authenticated through either method
    const isNextAuthAuth = status === 'authenticated';
    const isTokenAuth = checkToken();
    const hasAuth = isNextAuthAuth || isTokenAuth;

    if (status !== 'loading') {
      setAuthInitialized(true);
      
      if (!hasAuth) {
        console.log('No authentication found, redirecting to login');
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    }
  }, [status, router]);

  // Show loading state
  if (isLoading || status === 'loading' || !authInitialized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Main content - only render when authenticated
  if (status === 'authenticated' || hasCustomToken) {
    return <DashboardContent />;
  }

  // This should never render due to the redirect in useEffect
  return null;
}