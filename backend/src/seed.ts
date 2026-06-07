import { PrismaClient, InvoiceStatus, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DispatchFlow database...');

  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const hashedPassword = await bcrypt.hash('Demo1234!', 12);
  const user = await prisma.user.create({
    data: {
      fullName: 'Marcus Rivera',
      email: 'demo@dispatchflow.app',
      password: hashedPassword,
      companyName: 'SwiftHaul Logistics LLC',
      phoneNumber: '+1 (555) 214-9800',
      address: '4200 Commerce Dr, Chicago, IL 60601',
      taxNumber: '47-2938471',
    },
  });
  console.log(`✅ Created user: ${user.email}`);

  // Create clients
  const clientsData = [
    {
      companyName: 'Atlas Steel Corporation',
      contactPerson: 'Dana Park',
      email: 'dana.park@atlassteel.com',
      phone: '+1 (312) 555-0101',
      address: '800 Industrial Blvd',
      city: 'Gary',
      state: 'IN',
      zipCode: '46401',
      country: 'US',
      notes: 'Net 30 terms. Preferred pickup at 6AM. Heavy haul specialist required for steel coils.',
    },
    {
      companyName: 'Midwest Fresh Produce Co',
      contactPerson: 'Tom Keller',
      email: 'tom@mwfreshproduce.com',
      phone: '+1 (773) 555-0202',
      address: '2100 Market Street',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60608',
      country: 'US',
      notes: 'Temperature-sensitive loads. Reefer required. Weekly runs Tuesday and Friday.',
    },
    {
      companyName: 'GreatLakes Cement Inc',
      contactPerson: 'Sarah Oduya',
      email: 'sarah.oduya@glcement.com',
      phone: '+1 (219) 555-0303',
      address: '5 Lakeshore Drive',
      city: 'Hammond',
      state: 'IN',
      zipCode: '46320',
      country: 'US',
      notes: 'Flatbed required. Bulk cement loads. Call Sarah 30 min before arrival.',
    },
    {
      companyName: 'Pioneer Auto Parts',
      contactPerson: 'James Li',
      email: 'james.li@pioneerauto.com',
      phone: '+1 (847) 555-0404',
      address: '900 Dealer Avenue',
      city: 'Schaumburg',
      state: 'IL',
      zipCode: '60173',
      country: 'US',
      notes: 'LTL freight. Parts are fragile — blanket wrap required.',
    },
    {
      companyName: 'Harvest Grain Company',
      contactPerson: 'Maria Santos',
      email: 'maria@harvestgrain.com',
      phone: '+1 (309) 555-0505',
      address: 'Rural Route 4, Box 220',
      city: 'Peoria',
      state: 'IL',
      zipCode: '61602',
      country: 'US',
      notes: 'Seasonal peak July–October. Grain hauling. Scale tickets required.',
    },
    {
      companyName: 'Lakefront Brewing Co',
      contactPerson: 'Kevin Walsh',
      email: 'kevin.walsh@lakefrontbrew.com',
      phone: '+1 (414) 555-0606',
      address: '1872 Riverwest Parkway',
      city: 'Milwaukee',
      state: 'WI',
      zipCode: '53212',
      country: 'US',
      notes: 'Weekly delivery schedule. Pallet jack required. Loading dock hours 7AM–3PM.',
    },
  ];

  const clients = await Promise.all(
    clientsData.map(data => prisma.client.create({ data: { ...data, userId: user.id } }))
  );
  console.log(`✅ Created ${clients.length} clients`);

  // Invoice helper
  const createInvoice = async (
    clientIdx: number,
    invoiceNumber: string,
    issueDate: string,
    dueDate: string,
    status: InvoiceStatus,
    items: { description: string; quantity: number; rate: number }[],
    taxRate = 8,
    notes = '',
    paidDate?: string,
  ) => {
    const calculatedItems = items.map(item => ({
      ...item,
      amount: item.quantity * item.rate,
    }));
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    return prisma.invoice.create({
      data: {
        invoiceNumber,
        userId: user.id,
        clientId: clients[clientIdx].id,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        status,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        notes: notes || 'Payment due within agreed terms. Thank you for your business.',
        terms: 'Net 30',
        sentAt: status !== 'DRAFT' ? new Date(issueDate) : undefined,
        paidAt: paidDate ? new Date(paidDate) : undefined,
        items: { create: calculatedItems },
      },
    });
  };

  // Create 12 months of invoices
  const invoices = await Promise.all([
    // January
    createInvoice(0, 'INV-00001', '2025-01-05', '2025-02-04', 'PAID',
      [{ description: 'Flatbed haul Chicago→Gary (steel coils, 48t)', quantity: 3, rate: 1400 }], 8, '', '2025-01-28'),
    createInvoice(1, 'INV-00002', '2025-01-08', '2025-02-07', 'PAID',
      [{ description: 'Reefer run Chicago→Indianapolis (produce)', quantity: 4, rate: 700 }], 8, '', '2025-02-01'),
    createInvoice(5, 'INV-00003', '2025-01-15', '2025-02-14', 'PAID',
      [{ description: 'Box truck delivery Milwaukee metro (kegs)', quantity: 3, rate: 550 }, { description: 'Fuel surcharge', quantity: 1, rate: 85 }], 8, '', '2025-02-10'),

    // February
    createInvoice(2, 'INV-00004', '2025-02-03', '2025-03-05', 'PAID',
      [{ description: 'Bulk cement haul Hammond→Rockford', quantity: 4, rate: 1400 }], 8, '', '2025-02-25'),
    createInvoice(3, 'INV-00005', '2025-02-10', '2025-03-12', 'PAID',
      [{ description: 'LTL freight Schaumburg→Detroit (auto parts)', quantity: 2, rate: 1550 }], 8, '', '2025-03-05'),
    createInvoice(0, 'INV-00006', '2025-02-18', '2025-03-20', 'PAID',
      [{ description: 'Heavy haul Gary→Cleveland', quantity: 2, rate: 1900 }, { description: 'Permit fees', quantity: 1, rate: 240 }], 8, '', '2025-03-15'),

    // March
    createInvoice(1, 'INV-00007', '2025-03-04', '2025-04-03', 'PAID',
      [{ description: 'Reefer run Chicago→Columbus (fresh produce)', quantity: 5, rate: 720 }], 8, '', '2025-03-28'),
    createInvoice(5, 'INV-00008', '2025-03-11', '2025-04-10', 'PAID',
      [{ description: 'Weekly distribution Milwaukee/Kenosha/Racine', quantity: 4, rate: 490 }], 8, '', '2025-04-02'),
    createInvoice(2, 'INV-00009', '2025-03-20', '2025-04-19', 'PAID',
      [{ description: 'Flatbed haul Hammond→Springfield (cement bags)', quantity: 3, rate: 1250 }], 8, '', '2025-04-12'),

    // April
    createInvoice(0, 'INV-00010', '2025-04-02', '2025-05-02', 'PAID',
      [{ description: 'Steel coil transport Gary→Pittsburgh', quantity: 4, rate: 2100 }, { description: 'Oversize load flag car', quantity: 1, rate: 320 }], 8, '', '2025-04-24'),
    createInvoice(3, 'INV-00011', '2025-04-07', '2025-05-07', 'PAID',
      [{ description: 'Express parts delivery Schaumburg→Chicago', quantity: 6, rate: 380 }], 8, '', '2025-04-30'),
    createInvoice(4, 'INV-00012', '2025-04-14', '2025-05-14', 'PAID',
      [{ description: 'Grain haul Peoria→St. Louis (spring crop)', quantity: 3, rate: 1100 }], 8, '', '2025-05-08'),
    createInvoice(5, 'INV-00013', '2025-04-21', '2025-05-21', 'PAID',
      [{ description: 'Distribution run Milwaukee→Madison→Green Bay', quantity: 3, rate: 620 }], 8, '', '2025-05-15'),

    // May
    createInvoice(0, 'INV-00014', '2025-05-01', '2025-05-31', 'PAID',
      [{ description: 'Flatbed haul Chicago→Gary (48t steel coils)', quantity: 3, rate: 1400 }], 8, '', '2025-05-22'),
    createInvoice(2, 'INV-00015', '2025-05-10', '2025-06-09', 'PAID',
      [{ description: 'Bulk cement haul Hammond→Rockford', quantity: 4, rate: 1400 }], 8, '', '2025-05-30'),

    // June (current month - mixed statuses)
    createInvoice(1, 'INV-00016', '2025-06-02', '2025-07-02', 'SENT',
      [{ description: 'Reefer run Chicago→Indianapolis (produce)', quantity: 4, rate: 700 }], 8),
    createInvoice(5, 'INV-00017', '2025-04-15', '2025-05-15', 'OVERDUE',
      [{ description: 'Box truck delivery Milwaukee metro', quantity: 3, rate: 550 }], 8),
    createInvoice(3, 'INV-00018', '2025-06-05', '2025-07-05', 'DRAFT',
      [{ description: 'LTL freight Schaumburg→Detroit', quantity: 2, rate: 1550 }, { description: 'Inside delivery surcharge', quantity: 1, rate: 175 }], 8),
    createInvoice(4, 'INV-00019', '2025-06-06', '2025-07-06', 'SENT',
      [{ description: 'Grain transport Peoria→St. Louis', quantity: 2, rate: 1100 }], 8),
    createInvoice(0, 'INV-00020', '2025-06-07', '2025-07-07', 'DRAFT',
      [{ description: 'Heavy haul Gary→Cleveland', quantity: 2, rate: 1900 }], 8),
  ]);

  console.log(`✅ Created ${invoices.length} invoices`);

  // Record payments for paid invoices
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
  await Promise.all(
    paidInvoices.map(inv =>
      prisma.payment.create({
        data: {
          invoiceId: inv.id,
          amount: inv.totalAmount,
          paymentDate: inv.paidAt!,
          paymentMethod: ['BANK_TRANSFER', 'CHECK', 'ACH'][Math.floor(Math.random() * 3)] as PaymentMethod,
          referenceNumber: `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          notes: 'Payment received in full',
        },
      })
    )
  );
  console.log(`✅ Created payments for ${paidInvoices.length} invoices`);

  // Summary
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  console.log('\n📊 Seed Summary:');
  console.log(`   Users:    1`);
  console.log(`   Clients:  ${clients.length}`);
  console.log(`   Invoices: ${invoices.length}`);
  console.log(`   Revenue:  $${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log('\n🔑 Login credentials:');
  console.log('   Email:    demo@dispatchflow.app');
  console.log('   Password: Demo1234!');
  console.log('\n✨ Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
