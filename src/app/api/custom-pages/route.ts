// src/app/api/custom-pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Interface for custom page data
interface CustomPageData {
  id?: string;
  name: string;
  columns: string[];
}

// GET endpoint to fetch all custom pages
export async function GET(_request: NextRequest) {  // Added underscore to fix unused param warning
  try {
    // Authenticate user (any authenticated user can view custom pages)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch custom pages from database
    const customPages = await prisma.customPage.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(customPages);
  } catch (_error) {  // Added underscore to fix unused variable warning
    console.error('Error fetching custom pages:', _error);
    return NextResponse.json(
      { error: 'Failed to fetch custom pages' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new custom page
export async function POST(request: NextRequest) {
  try {
    // Authenticate and verify user is a beheerder
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info to check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || user.role !== 'BEHEERDER') {
      return NextResponse.json(
        { error: 'Only beheerders can create custom pages' },
        { status: 403 }
      );
    }

    // Parse request body
    const data: CustomPageData = await request.json();

    // Validate data
    if (!data.name || data.name.trim() === '') {
      return NextResponse.json({ error: 'Page name is required' }, { status: 400 });
    }

    if (!data.columns || data.columns.length === 0) {
      return NextResponse.json({ error: 'At least one column must be selected' }, { status: 400 });
    }

    // Check if a page with same name already exists
    const existingPage = await prisma.customPage.findFirst({
      where: { name: data.name },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: 'A page with this name already exists' },
        { status: 400 }
      );
    }

    // Create new custom page
    const customPage = await prisma.customPage.create({
      data: {
        name: data.name,
        columns: data.columns,
        createdBy: user.id,
      },
    });

    return NextResponse.json(customPage, { status: 201 });
  } catch (_error) {  // Added underscore to fix unused variable warning
    console.error('Error creating custom page:', _error);
    return NextResponse.json(
      { error: 'Failed to create custom page' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a custom page
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate and verify user is a beheerder
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info to check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || user.role !== 'BEHEERDER') {
      return NextResponse.json(
        { error: 'Only beheerders can delete custom pages' },
        { status: 403 }
      );
    }

    // Parse request body to get the page ID
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Page ID is required' },
        { status: 400 }
      );
    }

    // Delete the custom page
    await prisma.customPage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (_error) {  // Added underscore to fix unused variable warning
    console.error('Error deleting custom page:', _error);
    return NextResponse.json(
      { error: 'Failed to delete custom page' },
      { status: 500 }
    );
  }
}