// app/scan/page.tsx
'use client';

import OrderScanInterface from '@/components/OrderScanInterface';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function ScanPage() {
  const router = useRouter();
  const { status } = useSession();

  // Handle authentication redirect with useEffect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Handle loading state
  if (status === 'loading') {
    return (
      <div className="flex h-screen">
        <Navbar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Navbar />
      <div className="flex-1 overflow-auto">
        <OrderScanInterface />
      </div>
    </div>
  );
}