import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { PLAN_LIMITS, PLAN_PRICES } from './auth';

const prisma = new PrismaClient();

const num = (v: any) => Number(v || 0);

// GET /api/admin/organizations — every workspace (owner accounts) with stats
export const listOrganizations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const owners = await prisma.user.findMany({
      where: { ownerId: null, isSuperAdmin: false },
      select: { id: true, fullName: true, email: true, phoneNumber: true, companyName: true, plan: true, accountStatus: true, isSuperAdmin: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const organizations = await Promise.all(owners.map(async (o) => {
      // Everyone in the org (owner + members) — data is per-user, so aggregate across all
      const users = await prisma.user.findMany({ where: { OR: [{ id: o.id }, { ownerId: o.id }] }, select: { id: true } });
      const ids = users.map((u) => u.id);

      const [clients, invoices, loads, paid, outstanding, lastInvoice] = await Promise.all([
        prisma.client.count({ where: { userId: { in: ids } } }),
        prisma.invoice.count({ where: { userId: { in: ids } } }),
        prisma.load.count({ where: { userId: { in: ids } } }),
        prisma.invoice.aggregate({ where: { userId: { in: ids }, status: 'PAID' }, _sum: { totalAmount: true } }),
        prisma.invoice.aggregate({ where: { userId: { in: ids }, status: { in: ['SENT', 'OVERDUE'] } }, _sum: { totalAmount: true } }),
        prisma.invoice.findFirst({ where: { userId: { in: ids } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      ]);

      return {
        ...o,
        userCount: ids.length,
        limit: PLAN_LIMITS[o.plan] ?? 5,
        mrr: o.accountStatus === 'ACTIVE' ? (PLAN_PRICES[o.plan] ?? 0) : 0,
        clients, invoices, loads,
        revenue: num(paid._sum.totalAmount),
        outstanding: num(outstanding._sum.totalAmount),
        lastActivity: lastInvoice?.createdAt ?? null,
      };
    }));

    res.json({ organizations });
  } catch (err) { next(err); }
};

// PUT /api/admin/organizations/:id — change plan / activate / suspend
export const updateOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { plan, accountStatus } = req.body;

    const owner = await prisma.user.findFirst({ where: { id, ownerId: null } });
    if (!owner) return res.status(404).json({ error: 'Organization not found' });

    const data: any = {};
    if (plan && ['STARTER', 'GROWTH', 'BUSINESS'].includes(plan)) data.plan = plan;
    if (accountStatus && ['PENDING', 'ACTIVE', 'SUSPENDED'].includes(accountStatus)) data.accountStatus = accountStatus;
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update' });

    await prisma.user.update({ where: { id }, data });
    res.json({ message: 'Organization updated' });
  } catch (err) { next(err); }
};
