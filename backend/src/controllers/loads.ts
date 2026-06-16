import { Request, Response, NextFunction } from 'express';
import { PrismaClient, LoadStatus, LoadPaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const num = (v: any) => Number(v || 0);

const toDate = (v: any) => (v ? new Date(v) : null);

// GET /api/loads — paginated list + summary across all loads
export const getLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 20, status, paymentStatus, clientId, search, from, to } = req.query;

    const where: any = { userId };
    if (status) where.status = status as LoadStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus as LoadPaymentStatus;
    if (clientId) where.clientId = clientId as string;
    // Pickup-date range filter (calendar)
    if (from || to) {
      where.pickupAt = {};
      if (from) where.pickupAt.gte = new Date(from as string);
      if (to) { const end = new Date(to as string); end.setHours(23, 59, 59, 999); where.pickupAt.lte = end; }
    }
    if (search) {
      where.OR = [
        { loadNumber: { contains: search as string, mode: 'insensitive' } },
        { originCity: { contains: search as string, mode: 'insensitive' } },
        { destCity: { contains: search as string, mode: 'insensitive' } },
        { driver: { contains: search as string, mode: 'insensitive' } },
        { client: { companyName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [loads, total, all] = await Promise.all([
      prisma.load.findMany({
        where,
        include: { client: { select: { id: true, companyName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.load.count({ where }),
      // For summary cards — across ALL of the user's loads (not just this page/filter)
      prisma.load.findMany({ where: { userId }, select: { status: true, paymentStatus: true, rate: true } }),
    ]);

    const summary = {
      totalLoads: all.length,
      pending: all.filter((l) => l.status === 'PENDING').length,
      active: all.filter((l) => l.status === 'ACTIVE').length,
      delivered: all.filter((l) => l.status === 'DELIVERED').length,
      totalRevenue: all.filter((l) => l.status !== 'CANCELLED').reduce((s, l) => s + num(l.rate), 0),
      unpaidAmount: all.filter((l) => l.paymentStatus === 'UNPAID' && l.status !== 'CANCELLED').reduce((s, l) => s + num(l.rate), 0),
    };

    res.json({ loads, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), summary });
  } catch (err) {
    next(err);
  }
};

export const getLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const load = await prisma.load.findFirst({
      where: { id: req.params.id, userId },
      include: { client: true },
    });
    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json(load);
  } catch (err) {
    next(err);
  }
};

export const createLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const b = req.body;

    if (!b.clientId) return res.status(400).json({ error: 'Client is required' });

    const count = await prisma.load.count({ where: { userId } });
    const loadNumber = `LD-${String(count + 1).padStart(5, '0')}`;

    const load = await prisma.load.create({
      data: {
        loadNumber,
        userId,
        clientId: b.clientId,
        originCity: b.originCity || null,
        originState: b.originState || null,
        destCity: b.destCity || null,
        destState: b.destState || null,
        pickupAt: toDate(b.pickupAt),
        deliveryAt: toDate(b.deliveryAt),
        miles: b.miles ? num(b.miles) : null,
        rate: num(b.rate),
        equipment: b.equipment || null,
        weight: b.weight || null,
        commodity: b.commodity || null,
        driver: b.driver || null,
        referenceNumber: b.referenceNumber || null,
        status: (b.status as LoadStatus) || 'PENDING',
        paymentStatus: (b.paymentStatus as LoadPaymentStatus) || 'UNPAID',
        notes: b.notes || null,
      },
      include: { client: { select: { id: true, companyName: true } } },
    });

    res.status(201).json(load);
  } catch (err) {
    next(err);
  }
};

export const updateLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const b = req.body;

    const existing = await prisma.load.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Load not found' });

    // Only set fields that were provided (supports partial updates like a status toggle)
    const data: any = {};
    for (const f of ['originCity', 'originState', 'destCity', 'destState', 'equipment', 'weight', 'commodity', 'driver', 'referenceNumber', 'notes', 'status', 'paymentStatus']) {
      if (b[f] !== undefined) data[f] = b[f];
    }
    if (b.clientId !== undefined) data.clientId = b.clientId;
    if (b.pickupAt !== undefined) data.pickupAt = toDate(b.pickupAt);
    if (b.deliveryAt !== undefined) data.deliveryAt = toDate(b.deliveryAt);
    if (b.miles !== undefined) data.miles = b.miles ? num(b.miles) : null;
    if (b.rate !== undefined) data.rate = num(b.rate);

    const load = await prisma.load.update({
      where: { id },
      data,
      include: { client: { select: { id: true, companyName: true } } },
    });

    res.json(load);
  } catch (err) {
    next(err);
  }
};

export const deleteLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const existing = await prisma.load.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) return res.status(404).json({ error: 'Load not found' });
    await prisma.load.delete({ where: { id: req.params.id } });
    res.json({ message: 'Load deleted' });
  } catch (err) {
    next(err);
  }
};
