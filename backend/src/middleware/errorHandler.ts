import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const me = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, ownerId: true, role: true, isSuperAdmin: true },
    });
    if (!me) return res.status(401).json({ error: 'Invalid token' });

    // The "tenant" (workspace) is the owner: members share the owner's data.
    const tenantId = me.ownerId ?? me.id;
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
      select: { accountStatus: true, plan: true },
    });

    (req as any).userId = me.id;          // the logged-in user
    (req as any).tenantId = tenantId;     // owner whose workspace this is
    (req as any).role = me.role;
    (req as any).isSuperAdmin = me.isSuperAdmin;
    (req as any).accountStatus = tenant?.accountStatus ?? 'ACTIVE';
    (req as any).plan = tenant?.plan ?? 'STARTER';

    // Hard block suspended workspaces (super admins are exempt)
    if (!me.isSuperAdmin && tenant?.accountStatus === 'SUSPENDED') {
      return res.status(403).json({ error: 'Account suspended', code: 'SUSPENDED' });
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Guard for super-admin-only routes
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });
  next();
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }
  res.status(500).json({ error: 'Internal server error' });
};
