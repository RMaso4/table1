// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.columnPermission.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  // Create test users for each role
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'planner@test.com',
        password: await bcrypt.hash('test123', 10),
        name: 'Test Planner',
        role: 'PLANNER',
      },
    }),
    prisma.user.create({
      data: {
        email: 'beheerder@test.com',
        password: await bcrypt.hash('test123', 10),
        name: 'Test Beheerder',
        role: 'BEHEERDER',
      },
    }),
    prisma.user.create({
      data: {
        email: 'sales@test.com',
        password: await bcrypt.hash('test123', 10),
        name: 'Test Sales',
        role: 'SALES',
      },
    }),
    prisma.user.create({
      data: {
        email: 'scanner@test.com',
        password: await bcrypt.hash('test123', 10),
        name: 'Test Scanner',
        role: 'SCANNER',
      },
    }),
  ]);

  // Define columns that sales can edit
  const salesEditableColumns = [
    'project',
    'lever_datum',
    'opmerking',
    'inkoopordernummer',
  ];

  // Define all editable columns
  const allColumns = [
    'project',
    'pos',
    'type_artikel',
    'debiteur_klant',
    'material',
    'kantenband',
    'kleur',
    'height',
    'db_waarde',
    'opmerking',
    'productie_datum',
    'lever_datum',
    'startdatum_assemblage',
    'start_datum_machinale',
    'bruto_zagen',
    'pers',
    'netto_zagen',
    'verkantlijmen',
    'cnc_start_datum',
    'pmt_start_datum',
    'lakkerij_datum',
    'coaten_m1',
    'verkantlijmen_order_gereed',
    'inpak_rail',
    'boards',
    'frames',
    'ap_tws',
    'wp_frame',
    'wp_dwp_pc',
    'boards_component',
    'profielen',
    'kokers',
    'lakken',
    'mon',
    'pho',
    'pro',
    'ap',
    'sp',
    'cp',
    'wp',
    'dwp',
    'pc',
    'pcp',
    'totaal_boards',
    'tot',
    'controle_order',
    'inkoopordernummer',
    'gez_planning',
    'slotje',
  ];

  // Create permissions for each role
  for (const column of allColumns) {
    // PLANNER and BEHEERDER can edit everything
    await prisma.columnPermission.create({
      data: {
        role: 'PLANNER',
        column,
        canEdit: true,
        canView: true,
      },
    });

    await prisma.columnPermission.create({
      data: {
        role: 'BEHEERDER',
        column,
        canEdit: true,
        canView: true,
      },
    });

    // SALES can edit only specific columns
    await prisma.columnPermission.create({
      data: {
        role: 'SALES',
        column,
        canEdit: salesEditableColumns.includes(column),
        canView: true,
      },
    });

    // SCANNER can't edit anything but can view everything
    await prisma.columnPermission.create({
      data: {
        role: 'SCANNER',
        column,
        canEdit: false,
        canView: true,
      },
    });

    // GENERAL_ACCESS can only view
    await prisma.columnPermission.create({
      data: {
        role: 'GENERAL_ACCESS',
        column,
        canEdit: false,
        canView: true,
      },
    });
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });