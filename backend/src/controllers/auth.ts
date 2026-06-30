import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2).max(200),
  phoneNumber: z.string().optional(),
  plan: z.enum(['STARTER', 'GROWTH', 'BUSINESS']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const generateToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
};

export const PLAN_LIMITS: Record<string, number> = { STARTER: 5, GROWTH: 10, BUSINESS: 20 };

// Builds the client-facing user object: personal fields from self,
// company/plan/status from the org owner (so members see org branding).
export const buildMe = async (userId: string) => {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return null;
  const owner = u.ownerId ? await prisma.user.findUnique({ where: { id: u.ownerId } }) : u;
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phoneNumber: u.phoneNumber,
    role: u.role,
    isSuperAdmin: u.isSuperAdmin,
    companyName: owner?.companyName,
    logoUrl: owner?.logoUrl,
    address: owner?.address,
    taxNumber: owner?.taxNumber,
    plan: owner?.plan ?? 'STARTER',
    accountStatus: owner?.accountStatus ?? 'ACTIVE',
    maxUsers: PLAN_LIMITS[owner?.plan ?? 'STARTER'] ?? 5,
    createdAt: u.createdAt,
  };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const created = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        role: 'OWNER',
        accountStatus: 'PENDING', // requires activation (manual payment) before full access
      },
    });

    const token = generateToken(created.id);
    const user = await buildMe(created.id);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    const me = await buildMe(user.id);
    res.json({ user: me, token });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      // In production, send email with reset link
      // await sendPasswordResetEmail(email, resetToken);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If that email is registered, you will receive a reset link.' });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await buildMe((req as any).userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
};
