import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PLAN_LIMITS } from './auth';

const prisma = new PrismaClient();

const orgWhere = (tenantId: string) => ({ OR: [{ id: tenantId }, { ownerId: tenantId }] });

// GET /api/team — everyone in the workspace (owner + members)
export const getTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId;
    const plan = (req as any).plan;
    const members = await prisma.user.findMany({
      where: orgWhere(tenantId),
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ members, count: members.length, limit: PLAN_LIMITS[plan] ?? 5, plan, role: (req as any).role });
  } catch (err) { next(err); }
};

// POST /api/team — owner invites a member (enforces the plan's user limit)
export const addMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId;
    if ((req as any).role !== 'OWNER') return res.status(403).json({ error: 'Only the workspace owner can add members' });

    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const plan = (req as any).plan;
    const limit = PLAN_LIMITS[plan] ?? 5;
    const count = await prisma.user.count({ where: orgWhere(tenantId) });
    if (count >= limit) {
      return res.status(403).json({ error: `Your ${plan} plan allows up to ${limit} users. Upgrade to add more.`, code: 'LIMIT_REACHED' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const owner = await prisma.user.findUnique({ where: { id: tenantId } });
    const hashed = await bcrypt.hash(password, 12);
    const member = await prisma.user.create({
      data: {
        fullName, email, password: hashed,
        companyName: owner?.companyName ?? '',
        ownerId: tenantId, role: 'MEMBER', accountStatus: 'ACTIVE', plan: owner?.plan ?? 'STARTER',
      },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });
    res.status(201).json(member);
  } catch (err) { next(err); }
};

// DELETE /api/team/:id — owner removes a member
export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId;
    if ((req as any).role !== 'OWNER') return res.status(403).json({ error: 'Only the workspace owner can remove members' });
    const { id } = req.params;
    if (id === tenantId) return res.status(400).json({ error: 'Cannot remove the workspace owner' });
    const member = await prisma.user.findFirst({ where: { id, ownerId: tenantId } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
};
