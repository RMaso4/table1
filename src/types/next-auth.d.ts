// src/types/next-auth.d.ts
import { Role } from '@prisma/client';
import { DefaultSession } from 'next-auth';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession['user']
  }

  // Extend the built-in user types
  interface User {
    id: string;
    role: Role;
  }
}

// Extend JWT to include custom properties
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}