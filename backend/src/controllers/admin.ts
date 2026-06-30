import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { PLAN_LIMITS } from './auth';

const prisma = new PrismaClient();

// GET /api/admin/organizations — every workspace (owner accounts) with stats
export const listOrganizations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const owners = await prisma.user.findMany({
      where: { ownerId: null },
      select: { id: true, fullName: true, email: true, companyName: true, plan: true, accountStatus: true, isSuperAdmin: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const organizations = await Promise.all(owners.map(async (o) => {
      const [userCount, clients, invoices, loads] = await Promise.all([
        prisma.user.count({ where: { OR: [{ id: o.id }, { ownerId: o.id }] } }),
        prisma.client.count({ where: { userId: o.id } }),
        prisma.invoice.count({ where: { userId: o.id } }),
        prisma.load.count({ where: { userId: o.id } }),
      ]);
      return { ...o, userCount, limit: PLAN_LIMITS[o.plan] ?? 5, clients, invoices, loads };
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
