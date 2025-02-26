// src/types/next-auth.d.ts
import { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

// Re-export Role to prevent unused import warning
export { Role };

declare module 'next-auth' {
  interface User {
    id: string;
    role: Role;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }

  interface Session {
    user: User & {
      id: string;
      role: Role;
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}