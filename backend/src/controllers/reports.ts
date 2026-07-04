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

// ─── Smart Insights (all computed locally — no external AI, $0) ─────────────────
const DAY = 86_400_000;
const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY);

export const getInsights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const now = new Date();

    const invoices = await prisma.invoice.findMany({
      where: { userId },
      include: { client: { select: { id: true, companyName: true } } },
    });

    const num = (v: any) => Number(v || 0);
    const isOutstanding = (i: any) => i.status === 'SENT' || i.status === 'OVERDUE';
    const isOverdue = (i: any) => isOutstanding(i) && new Date(i.dueDate) < now;

    // ── Monthly summary ──────────────────────────────────────────────
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const paidBetween = (start: Date, end: Date | null) =>
      invoices
        .filter((i) => i.paidAt && i.paidAt >= start && (!end || i.paidAt < end))
        .reduce((s, i) => s + num(i.totalAmount), 0);

    const thisMonthRevenue = paidBetween(startThisMonth, null);
    const lastMonthRevenue = paidBetween(startLastMonth, startThisMonth);
    const pctChange = lastMonthRevenue ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;

    const overdueInvoices = invoices.filter(isOverdue);
    const overdueAmount = overdueInvoices.reduce((s, i) => s + num(i.totalAmount), 0);
    const outstandingAmount = invoices.filter(isOutstanding).reduce((s, i) => s + num(i.totalAmount), 0);

    const topClientMap: Record<string, { name: string; revenue: number }> = {};
    for (const i of invoices) {
      if (i.status !== 'PAID') continue;
      const e = (topClientMap[i.clientId] ||= { name: i.client.companyName, revenue: 0 });
      e.revenue += num(i.totalAmount);
    }
    const topClient = Object.values(topClientMap).sort((a, b) => b.revenue - a.revenue)[0] || null;

    // ── Reminders (overdue + due within 7 days) ──────────────────────
    const reminders = invoices
      .filter(isOutstanding)
      .map((i) => {
        const due = new Date(i.dueDate);
        const daysOverdue = daysBetween(now, due);
        return {
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          client: i.client.companyName,
          amount: num(i.totalAmount),
          dueDate: i.dueDate,
          daysOverdue,
          kind: daysOverdue > 0 ? 'overdue' : daysOverdue >= -7 ? 'due-soon' : 'open',
        };
      })
      .filter((r) => r.kind !== 'open')
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // ── Late-payer risk (per client) ─────────────────────────────────
    const cstats: Record<string, { name: string; paidDays: number; paidCount: number; outstanding: number; overdueCount: number }> = {};
    for (const i of invoices) {
      const c = (cstats[i.clientId] ||= { name: i.client.companyName, paidDays: 0, paidCount: 0, outstanding: 0, overdueCount: 0 });
      if (i.paidAt) { c.paidDays += Math.max(0, daysBetween(new Date(i.paidAt), new Date(i.issueDate))); c.paidCount += 1; }
      if (isOutstanding(i)) c.outstanding += num(i.totalAmount);
      if (isOverdue(i)) c.overdueCount += 1;
    }
    const latePayers = Object.values(cstats)
      .map((c) => {
        const avgDaysToPay = c.paidCount ? Math.round(c.paidDays / c.paidCount) : null;
        let risk: 'low' | 'medium' | 'high' = 'low';
        if (c.overdueCount > 0 || (avgDaysToPay !== null && avgDaysToPay > 45)) risk = 'high';
        else if (avgDaysToPay !== null && avgDaysToPay > 30) risk = 'medium';
        return { name: c.name, avgDaysToPay, outstanding: c.outstanding, overdueCount: c.overdueCount, risk };
      })
      .filter((c) => c.avgDaysToPay !== null || c.outstanding > 0)
      .sort((a, b) => (b.overdueCount - a.overdueCount) || ((b.avgDaysToPay || 0) - (a.avgDaysToPay || 0)));

    // ── Cash-flow forecast (next 3 months) ───────────────────────────
    // Baseline = average monthly collections over the last 6 months,
    // plus invoices already scheduled to come due in each upcoming month.
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const recentPaid = invoices.filter((i) => i.paidAt && i.paidAt >= sixMonthsAgo).reduce((s, i) => s + num(i.totalAmount), 0);
    const avgMonthly = recentPaid / 6;

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const forecast = [1, 2, 3].map((offset) => {
      const m = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
      const scheduled = invoices
        .filter((i) => isOutstanding(i) && new Date(i.dueDate) >= m && new Date(i.dueDate) < mEnd)
        .reduce((s, i) => s + num(i.totalAmount), 0);
      return { label: `${MONTHS[m.getMonth()]} ${m.getFullYear()}`, scheduled, projected: Math.round(scheduled + avgMonthly) };
    });

    // ── Possible duplicates (same client + amount within 7 days) ─────
    const duplicates: any[] = [];
    const sorted = [...invoices].sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i], b = sorted[j];
        if (a.clientId !== b.clientId) continue;
        if (num(a.totalAmount) !== num(b.totalAmount)) continue;
        const gap = Math.abs(daysBetween(new Date(b.issueDate), new Date(a.issueDate)));
        if (gap <= 7) {
          duplicates.push({ client: a.client.companyName, amount: num(a.totalAmount), a: a.invoiceNumber, b: b.invoiceNumber, aId: a.id, bId: b.id });
        }
      }
    }

    res.json({
      summary: {
        thisMonthRevenue,
        lastMonthRevenue,
        pctChange,
        outstandingAmount,
        overdueAmount,
        overdueCount: overdueInvoices.length,
        topClient,
      },
      reminders,
      latePayers,
      forecast,
      duplicates: duplicates.slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
};
