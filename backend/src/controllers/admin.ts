import { Request, Response, NextFunction } from 'express';
import { PLAN_LIMITS, PLAN_PRICES } from './auth';
import { prisma } from '../utils/prisma';

const num = (v: any) => Number(v || 0);

// GET /api/admin/organizations — every workspace (owner accounts) with stats
export const listOrganizations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const owners = await prisma.user.findMany({
      where: { ownerId: null, isSuperAdmin: false },
      select: { id: true, fullName: true, email: true, phoneNumber: true, companyName: true, plan: true, accountStatus: true, isSuperAdmin: true, createdAt: true, currentPeriodEnd: true, lastPaymentAt: true },
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
        price: PLAN_PRICES[o.plan] ?? 0,
        clients, invoices, loads,
        revenue: num(paid._sum.totalAmount),
        outstanding: num(outstanding._sum.totalAmount),
        lastActivity: lastInvoice?.createdAt ?? null,
      };
    }));

    res.json({ organizations });
  } catch (err) { next(err); }
};

// POST /api/admin/organizations/:id/pay — record a manual payment, extend one month
export const recordPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const owner = await prisma.user.findFirst({ where: { id, ownerId: null } });
    if (!owner) return res.status(404).json({ error: 'Organization not found' });

    const now = new Date();
    // Extend from the later of "now" or the current period end (stacks if paid early)
    const base = owner.currentPeriodEnd && owner.currentPeriodEnd > now ? new Date(owner.currentPeriodEnd) : now;
    const nextEnd = new Date(base);
    nextEnd.setMonth(nextEnd.getMonth() + 1);

    await prisma.user.update({
      where: { id },
      data: { accountStatus: 'ACTIVE', lastPaymentAt: now, currentPeriodEnd: nextEnd },
    });
    res.json({ message: 'Payment recorded', currentPeriodEnd: nextEnd });
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

export const listPlans = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.pricingPlan.findMany({ orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }] });
    res.json({ plans });
  } catch (err) { next(err); }
};

export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body || {};
    if (!b.code || !b.name) return res.status(400).json({ error: 'Code and name are required' });
    const plan = await prisma.pricingPlan.create({
      data: {
        code: String(b.code).toUpperCase(),
        name: String(b.name),
        tagline: b.tagline || null,
        description: b.description || null,
        price: Number(b.price || 0),
        userLimit: Number(b.userLimit || 0),
        popular: !!b.popular,
        active: b.active !== false,
        sortOrder: Number(b.sortOrder || 0),
        features: Array.isArray(b.features) ? b.features.map(String) : [],
      },
    });
    res.status(201).json(plan);
  } catch (err) { next(err); }
};

export const updatePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Plan not found' });
    const b = req.body || {};
    const plan = await prisma.pricingPlan.update({
      where: { id },
      data: {
        ...(b.code ? { code: String(b.code).toUpperCase() } : {}),
        ...(b.name ? { name: String(b.name) } : {}),
        ...(b.tagline !== undefined ? { tagline: b.tagline || null } : {}),
        ...(b.description !== undefined ? { description: b.description || null } : {}),
        ...(b.price !== undefined ? { price: Number(b.price) } : {}),
        ...(b.userLimit !== undefined ? { userLimit: Number(b.userLimit) } : {}),
        ...(b.popular !== undefined ? { popular: !!b.popular } : {}),
        ...(b.active !== undefined ? { active: !!b.active } : {}),
        ...(b.sortOrder !== undefined ? { sortOrder: Number(b.sortOrder) } : {}),
        ...(Array.isArray(b.features) ? { features: b.features.map(String) } : {}),
      },
    });
    res.json(plan);
  } catch (err) { next(err); }
};

export const deletePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Plan not found' });
    const used = await prisma.user.count({ where: { plan: existing.code } });
    if (used > 0) {
      await prisma.pricingPlan.update({ where: { id }, data: { active: false } });
      return res.json({ message: 'Plan deactivated because existing users depend on it' });
    }
    await prisma.pricingPlan.delete({ where: { id } });
    res.json({ message: 'Plan deleted' });
  } catch (err) { next(err); }
};
