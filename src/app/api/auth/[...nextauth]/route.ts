// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Create the handler
const handler = NextAuth(authOptions);

// Export only the valid HTTP method handlers
export { handler as GET, handler as POST };