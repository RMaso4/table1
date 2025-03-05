// src/app/login/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signIn, useSession } from 'next-auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const { status } = useSession();

  // Check if already authenticated
  useEffect(() => {
    // Only redirect if already authenticated and not in the process of logging in
    if (status === 'authenticated' && !isLoading) {
      setRedirecting(true);
      router.push('/dashboard');
    }
  }, [status, router, isLoading]);

  // Also check for custom token
  useEffect(() => {
    const hasCustomToken = document.cookie.includes('token=');
    if (hasCustomToken && !isLoading && !redirecting) {
      setRedirecting(true);
      router.push('/dashboard');
    }
  }, [router, isLoading, redirecting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Sign in with NextAuth credentials provider
      const nextAuthResult = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (nextAuthResult?.error) {
        setError(nextAuthResult.error);
        setIsLoading(false);
        return;
      }

      // 2. Also call custom login API to set JWT token
      const apiLoginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!apiLoginResponse.ok) {
        const data = await apiLoginResponse.json();
        throw new Error(data.error || 'Login failed');
      }

      // 3. Successful login - manually set a flag in localStorage for extra verification
      window.localStorage.setItem('auth_timestamp', Date.now().toString());

      // 4. Redirect to dashboard
      setRedirecting(true);
      window.location.href = '/dashboard'; // Use direct navigation instead of router.push
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white dark:bg-gray-800 p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welkom terug!</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Vul hieronder je inloggegevens in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="autofill-fix mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                            rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                            focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Wachtwoord
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="autofill-fix mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                            rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                            focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 dark:text-red-400 text-sm text-center">{error}</div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md 
                          shadow-sm text-sm font-medium text-white bg-[#003D73] hover:bg-[#002D53] 
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                          dark:focus:ring-offset-gray-800 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Log in'
                )}
              </button>

              {/* Development helpers */}
              {process.env.NODE_ENV !== 'production' && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick login</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('planner@test.com');
                        setPassword('test123');
                      }}
                      className="text-xs py-1 px-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 
                                dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded"
                    >
                      Planner
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('beheerder@test.com');
                        setPassword('test123');
                      }}
                      className="text-xs py-1 px-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 
                                dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded"
                    >
                      Beheerder
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Right side - Logo */}
      <div className="hidden md:block md:w-1/2 bg-[#003D73] flex items-center justify-center">
        <div className="p-8 w-4/5">
          <Image
            src="/ParthosLogo.svg"
            alt="Parthos Logo"
            width={600}
            height={600}
            className="w-full [filter:brightness(0)_invert(1)]"
            priority
          />
        </div>
      </div>
    </div>
  );
}