// routes/clients.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireSuperAdmin } from '../middleware/errorHandler';
import { buildMe } from '../controllers/auth';
import { getTeam, addMember, removeMember } from '../controllers/team';
import { listOrganizations, updateOrganization, recordPayment } from '../controllers/admin';

const prisma = new PrismaClient();
export const clientsRouter = Router();
clientsRouter.use(authenticate);

clientsRouter.get('/', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 20, search, sortBy = 'companyName' } = req.query;
    const where: any = { userId };
    if (search) {
      where.OR = [
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { contactPerson: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: { _count: { select: { invoices: true } } },
        orderBy: { [sortBy as string]: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.client.count({ where }),
    ]);
    res.json({ clients, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
});

clientsRouter.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, userId },
      include: {
        invoices: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) { next(err); }
});

clientsRouter.post('/', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const client = await prisma.client.create({ data: { ...req.body, userId } });
    res.status(201).json(client);
  } catch (err) { next(err); }
});

clientsRouter.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(client);
  } catch (err) { next(err); }
});

clientsRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted' });
  } catch (err) { next(err); }
});

// routes/invoices.ts
import { Router as IRouter } from 'express';
import { getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, generatePDF, sendInvoiceEmail, getItemSuggestions } from '../controllers/invoices';

export const invoicesRouter = IRouter();
invoicesRouter.use(authenticate);

invoicesRouter.get('/', getInvoices);
invoicesRouter.get('/item-suggestions', getItemSuggestions); // must precede '/:id'
invoicesRouter.get('/:id', getInvoice);
invoicesRouter.post('/', createInvoice);
invoicesRouter.put('/:id', updateInvoice);
invoicesRouter.delete('/:id', deleteInvoice);
invoicesRouter.get('/:id/pdf', generatePDF);
invoicesRouter.post('/:id/send', sendInvoiceEmail);

// routes/payments.ts
export const paymentsRouter = IRouter();
paymentsRouter.use(authenticate);

paymentsRouter.post('/', async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;
    const userId = (req as any).userId;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: { payments: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const payment = await prisma.payment.create({
      data: { invoiceId, amount, paymentDate: new Date(paymentDate), paymentMethod, referenceNumber, notes },
    });

    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + Number(amount);
    if (totalPaid >= Number(invoice.totalAmount)) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }

    res.status(201).json(payment);
  } catch (err) { next(err); }
});

// routes/loads.ts
import { getLoads, getLoad, createLoad, updateLoad, deleteLoad } from '../controllers/loads';

export const loadsRouter = IRouter();
loadsRouter.use(authenticate);
loadsRouter.get('/', getLoads);
loadsRouter.get('/:id', getLoad);
loadsRouter.post('/', createLoad);
loadsRouter.put('/:id', updateLoad);
loadsRouter.delete('/:id', deleteLoad);

// routes/reports.ts
import { getReports, getDashboard, getInsights } from '../controllers/reports';

export const reportsRouter = IRouter();
reportsRouter.use(authenticate);
reportsRouter.get('/', getReports);
reportsRouter.get('/dashboard', getDashboard);
reportsRouter.get('/insights', getInsights);

// routes/profile.ts
export const profileRouter = IRouter();
profileRouter.use(authenticate);

profileRouter.put('/', async (req, res, next) => {
  try {
    const selfId = (req as any).userId;
    const tenantId = (req as any).tenantId;
    const { fullName, companyName, phoneNumber, address, taxNumber, logoUrl } = req.body;
    // Personal fields → the logged-in user
    await prisma.user.update({ where: { id: selfId }, data: { fullName, phoneNumber } });
    // Company / branding fields → the workspace owner (shared across the org)
    await prisma.user.update({ where: { id: tenantId }, data: { companyName, address, taxNumber, logoUrl } });
    const me = await buildMe(selfId);
    res.json(me);
  } catch (err) { next(err); }
});

// routes/team.ts — workspace members (owner manages)
export const teamRouter = IRouter();
teamRouter.use(authenticate);
teamRouter.get('/', getTeam);
teamRouter.post('/', addMember);
teamRouter.delete('/:id', removeMember);

// routes/admin.ts — super-admin only
export const adminRouter = IRouter();
adminRouter.use(authenticate, requireSuperAdmin);
adminRouter.get('/organizations', listOrganizations);
adminRouter.put('/organizations/:id', updateOrganization);
adminRouter.post('/organizations/:id/pay', recordPayment);
