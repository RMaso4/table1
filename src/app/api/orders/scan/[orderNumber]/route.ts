// app/api/orders/scan/[orderNumber]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    // Await the params to access orderNumber
    const params = await context.params;
    const { orderNumber } = params;

    const order = await prisma.order.findFirst({
      where: {
        verkoop_order: orderNumber
      },
      select: {
        id: true,
        verkoop_order: true,
        project: true,
        debiteur_klant: true,
        type_artikel: true,
        material: true,
        bruto_zagen: true,
        pers: true,
        netto_zagen: true,
        verkantlijmen: true,
        cnc_start_datum: true,
        pmt_start_datum: true,
        slotje: true,
        // Include all instruction text fields
        popup_text_bruto_zagen: true,
        popup_text_pers: true,
        popup_text_netto_zagen: true,
        popup_text_verkantlijmen: true,
        popup_text_cnc: true,
        popup_text_pmt: true,
        popup_text_lakkerij: true,
        popup_text_inpak: true,
        popup_text_rail: true,
        popup_text_assemblage: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}