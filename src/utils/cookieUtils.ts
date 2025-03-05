// src/utils/cookieUtils.ts
export function getCookieFromContext(cookies: Record<string, string>, name: string): string | undefined {
    return cookies[name];
  }
  
  export function isGuestMode(cookies: Record<string, string>): boolean {
    return getCookieFromContext(cookies, 'guest_mode') === 'true';
  }