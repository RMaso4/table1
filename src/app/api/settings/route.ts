// src/app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Define types for settings
interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  tableCompactMode: boolean;
  defaultPageSize: number;
  showNotifications: boolean;
  defaultSortColumn: string;
  defaultSortDirection: 'asc' | 'desc';
  defaultColumns: string[];
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

interface AdminSettings {
  defaultRole: string;
  requireApprovalForChanges: boolean;
  trackOrderHistory: boolean;
  autoCloseNotifications: boolean;
  notificationRetentionDays: number;
  allowCustomPages: boolean;
  maxPriorityOrders: number;
  auditLogEnabled: boolean;
  autoBackup: boolean;
}

interface AllSettings {
  user: UserSettings;
  admin: AdminSettings;
}

// Default settings to use if none are found
const defaultSettings: AllSettings = {
  user: {
    theme: 'light',
    language: 'en',
    tableCompactMode: false,
    defaultPageSize: 50,
    showNotifications: true,
    defaultSortColumn: 'lever_datum',
    defaultSortDirection: 'asc',
    defaultColumns: ['verkoop_order', 'project', 'debiteur_klant', 'material', 'lever_datum'],
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '24h'
  },
  admin: {
    defaultRole: 'GENERAL_ACCESS',
    requireApprovalForChanges: false,
    trackOrderHistory: true,
    autoCloseNotifications: true,
    notificationRetentionDays: 30,
    allowCustomPages: true,
    maxPriorityOrders: 20,
    auditLogEnabled: true,
    autoBackup: true
  }
};

// GET endpoint to fetch user settings
export async function GET() {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true, settings: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the user has settings stored in the database
    if (user.settings) {
      try {
        // Parse stored settings
        const storedSettings = JSON.parse(user.settings as string) as Partial<AllSettings>;

        // Merge with defaults to ensure all properties exist
        const mergedSettings: AllSettings = {
          user: { ...defaultSettings.user, ...storedSettings.user },
          admin: { ...defaultSettings.admin, ...storedSettings.admin }
        };

        return NextResponse.json(mergedSettings);
      } catch (parseError) {
        console.error('Error parsing settings JSON:', parseError);
        // Fall back to default settings if stored settings are corrupt
        return NextResponse.json(defaultSettings);
      }
    }

    // No settings found, return defaults
    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST endpoint to update user settings
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      );
    }

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database. Please contact support.' },
        { status: 404 }
      );
    }

    // Parse the request body
    const settings = await request.json();

    // Validate settings structure
    if (!settings || !settings.user) {
      return NextResponse.json(
        { error: 'Invalid settings format. Please try again.' },
        { status: 400 }
      );
    }

    // Check permissions for admin settings with clearer error messages
    if (settings.admin && user.role !== 'BEHEERDER') {
      return NextResponse.json(
        { error: 'Only BEHEERDER role can modify admin settings.' },
        { status: 403 }
      );
    }

    // Prepare settings object based on user role
    const settingsToSave: Partial<AllSettings> = {
      user: settings.user
    };

    if (user.role === 'BEHEERDER') {
      settingsToSave.admin = settings.admin;
    }

    // Update user settings in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        settings: JSON.stringify(settingsToSave)
      }
    });

    return NextResponse.json({
      success: true,
      settings: settingsToSave,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings. Please try again later.' },
      { status: 500 }
    );
  }
}