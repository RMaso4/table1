// components/Navbar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import NotificationPanel from './NotificationPanel';

const navItems = [
  { path: '/dashboard', label: 'Overview' },
  { path: '/scan', label: 'Scan Orders' }
];

interface NavbarProps {
  onLogout?: () => void;
}

export default function Navbar({ onLogout }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    if (onLogout) {
      // Call the parent's logout handler which should handle both types of auth
      onLogout();
    } else {
      try {
        // Clear the custom JWT token cookie
        await fetch('/api/auth/logout', {
          method: 'POST',
        });
        
        // Then clear the NextAuth session
        await signOut({ redirect: false });
        router.push('/login');
      } catch (error) {
        console.error('Logout failed:', error);
        router.push('/login');
      }
    }
  };

  return (
    <div className="w-64 bg-[#003D73] text-white h-screen flex flex-col">
      <nav className="flex-1 py-6">
        <div className="px-4 mb-8">
          <Image
            src="/ParthosLogo.svg"
            alt="Parthos Logo"
            width={130}
            height={80}
            className="w-32 h-auto [filter:brightness(0)_invert(1)]"
          />
        </div>
        
        {session && (
          <div className="px-4 mb-6">
            <p className="text-sm text-gray-300">Signed in as:</p>
            <p className="text-sm font-medium truncate">{session.user?.name || session.user?.email}</p>
            <p className="text-xs text-gray-400">{session.user?.role}</p>
          </div>
        )}
        
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`
                  block px-4 py-2 text-sm
                  ${pathname === item.path
                    ? 'bg-[#002D53]'
                    : 'hover:bg-[#29679b]'}
                `}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Notifications and Logout */}
      <div className="p-4 flex items-center justify-between">
        {session?.user?.role === 'PLANNER' || session?.user?.role === 'BEHEERDER' ? (
          <NotificationPanel />
        ) : (
          <div></div> // Empty div to maintain flex layout
        )}
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-white hover:bg-[#002D53] rounded transition-colors text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}