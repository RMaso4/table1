// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashboardContent } from '@/components/DashboardContent';

export default function Dashboard() {
  const router = useRouter();
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on load
  useEffect(() => {
    // Only redirect if not authenticated and not loading
    if (status === 'unauthenticated') {
      console.log('No authentication found, redirecting to login');
      router.push('/login');
    } else if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [status, router]);

  // Show loading state
  if (isLoading || status === 'loading') {
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
  if (status === 'authenticated') {
    return <DashboardContent />;
  }

  // This should never render due to the redirect in useEffect
  return null;
}