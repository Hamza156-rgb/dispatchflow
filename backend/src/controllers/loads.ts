import { Request, Response, NextFunction } from 'express';
import { LoadStatus, LoadPaymentStatus, LoadSource } from '@prisma/client';
import { prisma } from '../utils/prisma';

// Where a load came from. Client-supplied, so validate against the enum —
// DAT is excluded here: only the load-board importer may claim that source.
const USER_SOURCES: LoadSource[] = ['MANUAL', 'PASTE'];
const toSource = (v: any): LoadSource =>
  USER_SOURCES.includes(String(v).toUpperCase() as LoadSource) ? (String(v).toUpperCase() as LoadSource) : 'MANUAL';

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

    const [loads, total, summaryRows] = await Promise.all([
      prisma.load.findMany({
        where,
        include: { client: { select: { id: true, companyName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.load.count({ where }),
      prisma.load.groupBy({
        by: ['status', 'paymentStatus'],
        where: { userId },
        _count: { _all: true },
        _sum: { rate: true },
      }),
    ]);

    const totals = summaryRows.reduce(
      (acc, row) => {
        acc.totalLoads += row._count._all;
        acc.pending += row.status === 'PENDING' ? row._count._all : 0;
        acc.active += row.status === 'ACTIVE' ? row._count._all : 0;
        acc.delivered += row.status === 'DELIVERED' ? row._count._all : 0;
        acc.totalRevenue += row.status !== 'CANCELLED' ? Number(row._sum.rate || 0) : 0;
        acc.unpaidAmount += row.status !== 'CANCELLED' && row.paymentStatus === 'UNPAID' ? Number(row._sum.rate || 0) : 0;
        return acc;
      },
      { totalLoads: 0, pending: 0, active: 0, delivered: 0, totalRevenue: 0, unpaidAmount: 0 },
    );

    const summary = {
      ...totals,
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
        source: toSource(b.source),
      },
      include: { client: { select: { id: true, companyName: true } } },
    });

    res.status(201).json(load);
  } catch (err) {
    next(err);
  }
};

// POST /api/loads/bulk — import many loads at once (from a CSV upload)
export const bulkCreateLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ error: 'No rows provided' });
    if (rows.length > 1000) return res.status(400).json({ error: 'Too many rows (max 1000 per import)' });

    const safeDate = (v: any) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
    const STATUSES = ['PENDING', 'ACTIVE', 'DELIVERED', 'CANCELLED'];
    const PAYS = ['UNPAID', 'PAID'];

    // Cache this user's clients by lowercased company name (auto-create missing ones)
    const clients = await prisma.client.findMany({ where: { userId }, select: { id: true, companyName: true } });
    const clientMap = new Map(clients.map((c) => [c.companyName.trim().toLowerCase(), c.id]));

    let count = await prisma.load.count({ where: { userId } });
    let created = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      try {
        const name = String(r.client || '').trim();
        if (!name) { errors.push({ row: i + 1, error: 'Missing client name' }); continue; }
        if (r.rate === undefined || r.rate === '' || isNaN(Number(r.rate))) { errors.push({ row: i + 1, error: 'Missing/invalid rate' }); continue; }

        let clientId = clientMap.get(name.toLowerCase());
        if (!clientId) {
          const c = await prisma.client.create({ data: { userId, companyName: name, contactPerson: name, email: '' } });
          clientId = c.id;
          clientMap.set(name.toLowerCase(), c.id);
        }

        count += 1;
        const status = STATUSES.includes(String(r.status || '').toUpperCase()) ? String(r.status).toUpperCase() : 'PENDING';
        const paymentStatus = PAYS.includes(String(r.paymentStatus || '').toUpperCase()) ? String(r.paymentStatus).toUpperCase() : 'UNPAID';

        await prisma.load.create({
          data: {
            loadNumber: `LD-${String(count).padStart(5, '0')}`,
            userId, clientId,
            originCity: r.originCity || null, originState: r.originState || null,
            destCity: r.destCity || null, destState: r.destState || null,
            pickupAt: safeDate(r.pickupAt), deliveryAt: safeDate(r.deliveryAt),
            miles: r.miles ? num(r.miles) : null,
            rate: num(r.rate),
            equipment: r.equipment || null, driver: r.driver || null,
            referenceNumber: r.referenceNumber || null, notes: r.notes || null,
            status: status as LoadStatus, paymentStatus: paymentStatus as LoadPaymentStatus,
            source: 'CSV',
          },
        });
        created += 1;
      } catch (e: any) {
        errors.push({ row: i + 1, error: e?.message || 'Failed' });
      }
    }

    res.json({ created, failed: errors.length, errors: errors.slice(0, 20) });
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
