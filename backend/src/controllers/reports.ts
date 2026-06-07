import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { year = new Date().getFullYear() } = req.query;

    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31T23:59:59`);

    // Monthly revenue
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ['PAID'] },
        paidAt: { gte: startOfYear, lte: endOfYear },
      },
      select: { totalAmount: true, paidAt: true, clientId: true },
    });

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthInvoices = invoices.filter(inv => {
        const d = new Date(inv.paidAt!);
        return d.getMonth() + 1 === month;
      });
      return {
        month,
        revenue: monthInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
        count: monthInvoices.length,
      };
    });

    // Status breakdown
    const statusCounts = await prisma.invoice.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
      _sum: { totalAmount: true },
    });

    // Top clients by revenue
    const allPaidInvoices = await prisma.invoice.findMany({
      where: { userId, status: 'PAID' },
      include: { client: { select: { id: true, companyName: true } } },
    });

    const clientRevenue: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const inv of allPaidInvoices) {
      const cid = inv.clientId;
      if (!clientRevenue[cid]) {
        clientRevenue[cid] = { name: inv.client.companyName, revenue: 0, count: 0 };
      }
      clientRevenue[cid].revenue += Number(inv.totalAmount);
      clientRevenue[cid].count += 1;
    }

    const topClients = Object.values(clientRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({ monthlyRevenue, statusCounts, topClients, year: Number(year) });
  } catch (err) {
    next(err);
  }
};

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalClients, invoiceCounts, monthlyRevenue, recentInvoices] = await Promise.all([
      prisma.client.count({ where: { userId } }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { userId, status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.findMany({
        where: { userId },
        include: { client: { select: { companyName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      totalClients,
      invoiceCounts,
      monthlyRevenue: Number(monthlyRevenue._sum.totalAmount || 0),
      recentInvoices,
    });
  } catch (err) {
    next(err);
  }
};
