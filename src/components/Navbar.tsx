// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import NotificationPanel from './NotificationPanel';
import { useState, useEffect } from 'react';
import { Plus, Moon, Sun, LogIn, UserIcon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { getCookie, deleteCookie } from 'cookies-next';

// Add a type for custom pages
interface CustomPage {
  id: string;
  name: string;
  path: string;
  columns: string[];
}

interface NavbarProps {
  onLogout?: () => void;
}

export default function Navbar({ onLogout }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  
  // Guest mode state
  const [isGuestMode, setIsGuestMode] = useState(false);
  
  // State for custom pages
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  
  // Check for guest mode
  useEffect(() => {
    const guestMode = getCookie('guest_mode') === 'true';
    setIsGuestMode(guestMode);
  }, []);
  
  // Fetch custom pages from API on component mount
  useEffect(() => {
    const fetchCustomPages = async () => {
      try {
        setPagesLoading(true);
        const response = await fetch('/api/custom-pages');
        
        if (response.ok) {
          const data = await response.json();
          setCustomPages(data.map((page: any) => ({
            ...page,
            path: `/custom/${page.id}`
          })));
        } else {
          console.error('Failed to fetch custom pages');
        }
      } catch (error) {
        console.error('Error fetching custom pages:', error);
      } finally {
        setPagesLoading(false);
      }
    };
    
    fetchCustomPages();
  }, [session]);

  // Base navigation items
  const baseNavItems = [
    { path: '/dashboard', label: 'Overview' },
    { path: '/scan', label: 'Scan Orders' },
    { path: '/settings', label: 'Settings' }
  ];
  
  // Combine base items with custom pages
  const navItems = [
    ...baseNavItems,
    ...customPages.map(page => ({ 
      path: `/custom/${page.id}`, 
      label: page.name
    }))
  ];

  const handleLogout = async () => {
    if (isGuestMode) {
      try {
        // Clear guest mode cookie
        await fetch('/api/auth/guest', {
          method: 'DELETE',
        });
        deleteCookie('guest_mode');
        router.push('/login');
      } catch (error) {
        console.error('Error logging out of guest mode:', error);
        router.push('/login');
      }
      return;
    }
    
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

  // Theme toggle function
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="w-64 bg-[#003D73] dark:bg-[#001a33] text-white h-screen flex flex-col">
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
        
        {/* Session info or Guest mode indicator */}
        {isGuestMode ? (
          <div className="px-4 mb-6 bg-amber-800/30 py-2 rounded-md mx-2">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-amber-300">Guest Mode</p>
            </div>
            <p className="text-xs text-amber-400/80 mt-1">Limited to view-only access</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => router.push('/login')}
                className="flex items-center gap-1 text-xs bg-amber-700/50 hover:bg-amber-700 px-2 py-1 rounded"
              >
                <LogIn className="h-3 w-3" />
                <span>Log In</span>
              </button>
            </div>
          </div>
        ) : session ? (
          <div className="px-4 mb-6">
            <p className="text-sm text-gray-300">Signed in as:</p>
            <p className="text-sm font-medium truncate">{session.user?.name || session.user?.email}</p>
            <p className="text-xs text-gray-400">{session.user?.role}</p>
          </div>
        ) : null}
        
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`
                  block px-4 py-2 text-sm
                  ${pathname === item.path
                    ? 'bg-[#002D53] dark:bg-[#000d1a]'
                    : 'hover:bg-[#29679b] dark:hover:bg-[#1a4060]'}
                `}
              >
                {item.label}
              </Link>
            </li>
          ))}
          
          {/* Add button for new pages - only for beheerder and not in guest mode */}
          {session?.user?.role === 'BEHEERDER' && !isGuestMode && (
            <li>
              <Link
                href="/add-page"
                className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#29679b] dark:hover:bg-[#1a4060]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Page
              </Link>
            </li>
          )}
        </ul>
      </nav>
      
      {/* Notifications, Theme Toggle and Logout */}
      <div className="p-4 flex items-center justify-between">
        {(session?.user?.role === 'PLANNER' || session?.user?.role === 'BEHEERDER') && !isGuestMode ? (
          <NotificationPanel />
        ) : (
          <div></div> // Empty div to maintain flex layout
        )}
        <div className="flex items-center gap-2">
          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-white hover:bg-[#002D53] dark:hover:bg-[#000d1a]"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-white hover:bg-[#002D53] dark:hover:bg-[#000d1a] rounded transition-colors text-sm"
          >
            {isGuestMode ? 'Exit Guest Mode' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}