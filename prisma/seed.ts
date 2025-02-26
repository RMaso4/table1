// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');
  
  // Clear existing data
  console.log('Cleaning existing data...');
  await prisma.columnPermission.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  console.log('Existing data cleared successfully');

  // Create test users for each role
  console.log('Creating test users...');
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
  console.log(`Created ${users.length} test users`);

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
  console.log('Creating permissions...');
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
  console.log('Permissions created successfully');
  
  // Create 10 sample orders
  console.log('Creating sample orders...');
  
  const materials = ['Oak', 'Pine', 'Walnut', 'Maple', 'Cherry', 'Beech', 'Birch', 'Mahogany'];
  const colors = ['Natural', 'White', 'Black', 'Grey', 'Brown', 'Blue', 'Green', 'Red'];
  const customers = ['IKEA', 'Furniture Co', 'Office Solutions', 'Home Interiors', 'Modern Living', 'Corporate Spaces'];
  const articleTypes = ['Table', 'Desk', 'Cabinet', 'Shelf', 'Panel', 'Door', 'Frame', 'Countertop'];
  
  const orders = [];
  
  for (let i = 1; i <= 10; i++) {
    const orderNumber = `ORD-${(1000 + i).toString()}`;
    const randomMaterial = materials[Math.floor(Math.random() * materials.length)];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const randomArticleType = articleTypes[Math.floor(Math.random() * articleTypes.length)];
    
    // Create a date within the last month
    const today = new Date();
    const randomDaysAgo = Math.floor(Math.random() * 30);
    const randomDate = new Date(today);
    randomDate.setDate(today.getDate() - randomDaysAgo);
    
    // Create a future delivery date
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 5);
    
    const order = await prisma.order.create({
      data: {
        verkoop_order: orderNumber,
        project: `Project ${i}`,
        pos: i,
        type_artikel: randomArticleType,
        debiteur_klant: randomCustomer,
        material: randomMaterial,
        kantenband: 'Standard',
        kleur: randomColor,
        height: 75 + Math.floor(Math.random() * 50),
        db_waarde: Math.floor(Math.random() * 100) + 50,
        opmerking: i % 3 === 0 ? `Special order for ${randomCustomer}` : null,
        lever_datum: deliveryDate,
        tot: Math.floor(Math.random() * 10) + 1,
        totaal_boards: Math.floor(Math.random() * 5) + 1,
        // Only set some production dates for variety
        bruto_zagen: i % 4 === 0 ? randomDate : null,
        pers: i % 5 === 0 ? randomDate : null,
        productie_datum: randomDate,
      }
    });
    
    orders.push(order);
  }
  
  console.log(`Created ${orders.length} sample orders`);

  // Create some notifications for example
  console.log('Creating sample notifications...');
  
  for (let i = 0; i < 5; i++) {
    const randomOrder = orders[Math.floor(Math.random() * orders.length)];
    await prisma.notification.create({
      data: {
        message: `Order ${randomOrder.verkoop_order} updated to production stage`,
        orderId: randomOrder.id,
        userId: users[0].id, // Assign to planner
        read: i < 2, // Some read, some unread
      }
    });
  }
  
  console.log('Sample notifications created successfully');
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