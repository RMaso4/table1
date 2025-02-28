// types/index.ts
import { Role } from '@prisma/client';

// Re-export the Role enum so ESLint doesn't flag it as unused
export { Role };

declare module 'next-auth' {
  interface User {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
  }

  interface Session {
    user: User;
  }
}

export interface SortState {
  field: string | null;
  direction: 'asc' | 'desc' | null;
}

declare module 'next-auth/jwt' {
    interface JWT {
      role: string;
      id: string;
    }
  }

export interface Notification {
  id: string;
  message: string;
  orderId: string;
  userId: string;
  read: boolean;
  createdAt: Date;
  user?: {
    name: string | null;
    email: string;
  };
}

export interface Order {
  id: string;
  verkoop_order: string;
  project: string | null;
  debiteur_klant: string;
  type_artikel: string;
  material: string;
  bruto_zagen: string | null;
  pers: string | null;
  netto_zagen: string | null;
  verkantlijmen: string | null;
  cnc_start_datum: string | null;
  pmt_start_datum: string | null;
  [key: string]: string | number | boolean | null | undefined;
}