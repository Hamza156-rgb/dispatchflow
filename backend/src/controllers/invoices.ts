import { Request, Response, NextFunction } from 'express';
import { PrismaClient, InvoiceStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 20, status, clientId, search } = req.query;

    const where: any = { userId };
    if (status) where.status = status as InvoiceStatus;
    if (clientId) where.clientId = clientId as string;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
        { client: { companyName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { client: true, items: true, payments: true },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.invoice.count({ where }),
    ]);

    // Auto-update overdue status
    const now = new Date();
    for (const invoice of invoices) {
      if (invoice.status === 'SENT' && invoice.dueDate < now) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'OVERDUE' },
        });
        invoice.status = 'OVERDUE';
      }
    }

    res.json({ invoices, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
};

export const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId },
      include: { client: true, items: true, payments: true },
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Auto-update overdue status
    if (invoice.status === 'SENT' && invoice.dueDate < new Date()) {
      await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'OVERDUE' } });
      invoice.status = 'OVERDUE';
    }

    res.json(invoice);
  } catch (err) {
    next(err);
  }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { clientId, issueDate, dueDate, items, taxRate = 0, notes, terms } = req.body;

    // Generate invoice number
    const count = await prisma.invoice.count({ where: { userId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

    // Calculate amounts
    const calculatedItems = items.map((item: any) => ({
      ...item,
      amount: Number(item.quantity) * Number(item.rate),
    }));

    const subtotal = calculatedItems.reduce((sum: number, item: any) => sum + item.amount, 0);
    const taxAmount = (subtotal * Number(taxRate)) / 100;
    const totalAmount = subtotal + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        userId,
        clientId,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        notes,
        terms,
        items: { create: calculatedItems },
      },
      include: { client: true, items: true },
    });

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
};

export const updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { items, taxRate, ...rest } = req.body;

    const existing = await prisma.invoice.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });

    let updateData: any = { ...rest };

    if (items) {
      const calculatedItems = items.map((item: any) => ({
        ...item,
        amount: Number(item.quantity) * Number(item.rate),
      }));
      const subtotal = calculatedItems.reduce((sum: number, item: any) => sum + item.amount, 0);
      const tax = taxRate ?? existing.taxRate;
      const taxAmount = (subtotal * Number(tax)) / 100;

      updateData = {
        ...updateData,
        taxRate: tax,
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount,
      };

      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await prisma.invoiceItem.createMany({
        data: calculatedItems.map((item: any) => ({ ...item, invoiceId: id })),
      });
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { client: true, items: true, payments: true },
    });

    res.json(invoice);
  } catch (err) {
    next(err);
  }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const existing = await prisma.invoice.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });

    await prisma.invoice.delete({ where: { id } });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};

export const generatePDF = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId },
      include: { client: true, items: true, user: true },
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const doc = new PDFDocument({ margin: 50 });
    // Buffer the PDF in memory so an image-render error can't leave the
    // HTTP response hanging — we only send once generation fully succeeds.
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('error', (e) => next(e));
    doc.on('end', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      res.send(Buffer.concat(chunks));
    });

    // Company logo (optional) — decode the base64 data URL stored on the user
    let logoBuf: Buffer | null = null;
    if (invoice.user.logoUrl) {
      const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(invoice.user.logoUrl);
      if (m) { try { logoBuf = Buffer.from(m[2], 'base64'); } catch { logoBuf = null; } }
    }
    if (logoBuf) {
      try { doc.image(logoBuf, 50, 45, { fit: [160, 55] }); } catch { /* bad image — skip */ }
    }

    // When a logo is shown, push the rest of the header down to make room.
    const titleY = logoBuf ? 115 : 50;

    // Header
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#1a1a2e').text('INVOICE', 50, titleY);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(invoice.invoiceNumber, 50, titleY + 35);

    // Company info (right side)
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text(invoice.user.companyName, 300, titleY, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text(invoice.user.email, 300, titleY + 18, { align: 'right' })
      .text(invoice.user.phoneNumber || '', 300, titleY + 32, { align: 'right' });

    // Divider
    const dividerY = titleY + 60;
    doc.moveTo(50, dividerY).lineTo(545, dividerY).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // Dates block
    const metaY = dividerY + 15;
    doc.fontSize(9).fillColor('#9ca3af').text('ISSUE DATE', 50, metaY);
    doc.fontSize(10).fillColor('#111').text(new Date(invoice.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 50, metaY + 13);

    doc.fontSize(9).fillColor('#9ca3af').text('DUE DATE', 200, metaY);
    doc.fontSize(10).fillColor('#111').text(new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 200, metaY + 13);

    doc.fontSize(9).fillColor('#9ca3af').text('STATUS', 350, metaY);
    doc.fontSize(10).fillColor('#111').text(invoice.status, 350, metaY + 13);

    // Bill To
    const billY = metaY + 50;
    doc.fontSize(9).fillColor('#9ca3af').text('BILL TO', 50, billY);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111').text(invoice.client.companyName, 50, billY + 13);
    doc.fontSize(9).font('Helvetica').fillColor('#555')
      .text(invoice.client.contactPerson, 50, billY + 27)
      .text(invoice.client.email, 50, billY + 40)
      .text(invoice.client.phone || '', 50, billY + 53);

    // Items table header
    const tableTop = billY + 90;
    doc.rect(50, tableTop, 495, 25).fillColor('#f3f4f6').fill();
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151');
    doc.text('DESCRIPTION', 60, tableTop + 8);
    doc.text('QTY', 350, tableTop + 8);
    doc.text('RATE', 400, tableTop + 8);
    doc.text('AMOUNT', 470, tableTop + 8);

    // Items
    let y = tableTop + 35;
    for (const item of invoice.items) {
      doc.fontSize(9).font('Helvetica').fillColor('#111').text(item.description, 60, y, { width: 270 });
      doc.text(String(item.quantity), 350, y);
      doc.text(`$${Number(item.rate).toFixed(2)}`, 400, y);
      doc.text(`$${Number(item.amount).toFixed(2)}`, 470, y);
      doc.moveTo(50, y + 18).lineTo(545, y + 18).strokeColor('#f3f4f6').lineWidth(0.5).stroke();
      y += 25;
    }

    // Totals
    y += 10;
    doc.fontSize(9).fillColor('#666').text('Subtotal', 400, y);
    doc.fillColor('#111').text(`$${Number(invoice.subtotal).toFixed(2)}`, 470, y);
    y += 18;
    doc.fillColor('#666').text(`Tax (${Number(invoice.taxRate)}%)`, 400, y);
    doc.fillColor('#111').text(`$${Number(invoice.taxAmount).toFixed(2)}`, 470, y);
    y += 18;
    doc.rect(390, y, 155, 28).fillColor('#1a1a2e').fill();
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#fff').text('TOTAL', 400, y + 7);
    doc.text(`$${Number(invoice.totalAmount).toFixed(2)}`, 455, y + 7);

    // Notes
    if (invoice.notes) {
      y += 60;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('NOTES', 50, y);
      doc.fontSize(9).font('Helvetica').fillColor('#666').text(invoice.notes, 50, y + 14, { width: 300 });
    }

    // Footer — keep within the bottom margin so PDFKit doesn't spill onto a 2nd page
    doc.fontSize(8).fillColor('#9ca3af').text('Thank you for your business.', 50, doc.page.height - 72, {
      align: 'center',
      lineBreak: false,
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};

export const sendInvoiceEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { message } = req.body;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId },
      include: { client: true, user: true, items: true },
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"${invoice.user.companyName}" <${process.env.SMTP_USER}>`,
      to: invoice.client.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.user.companyName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Invoice ${invoice.invoiceNumber}</h2>
          <p>Dear ${invoice.client.contactPerson},</p>
          <p>${message || `Please find attached invoice ${invoice.invoiceNumber} for $${Number(invoice.totalAmount).toFixed(2)}, due ${new Date(invoice.dueDate).toLocaleDateString()}.`}</p>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Amount:</strong> $${Number(invoice.totalAmount).toFixed(2)}</p>
            <p><strong>Due:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
          <p>Thank you for your business.</p>
          <p>${invoice.user.fullName}<br>${invoice.user.companyName}</p>
        </div>
      `,
    });

    await prisma.invoice.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    res.json({ message: 'Invoice sent successfully' });
  } catch (err) {
    next(err);
  }
};

// Smart line-item suggestions from past invoices (this client first, then all)
export const getItemSuggestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { clientId } = req.query;

    const items = await prisma.invoiceItem.findMany({
      where: { invoice: { userId, ...(clientId ? { clientId: clientId as string } : {}) } },
      select: { description: true, rate: true },
      orderBy: { id: 'desc' },
      take: 200,
    });

    // Dedupe by description, keep most recent rate
    const seen = new Map<string, number>();
    for (const it of items) {
      const key = it.description.trim();
      if (key && !seen.has(key)) seen.set(key, Number(it.rate));
    }
    const suggestions = Array.from(seen.entries()).slice(0, 25).map(([description, rate]) => ({ description, rate }));
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
};
