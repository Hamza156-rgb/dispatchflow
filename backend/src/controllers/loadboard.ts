import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt, maskAccount } from '../utils/crypto';
import { parseLoadText } from '../utils/parseLoadText';
import { logger } from '../utils/logger';
import {
  getProvider,
  isMockMode,
  LoadBoardAuthError,
  LoadBoardNotConfiguredError,
  LoadBoardResult,
  LoadBoardSearchParams,
} from '../services/loadboard';

const prisma = new PrismaClient();
const PROVIDER = 'DAT';

// GET /api/loadboard/status — is this dispatcher connected, and to what?
export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const cred = await prisma.loadBoardCredential.findUnique({
      where: { userId_provider: { userId, provider: PROVIDER } },
    });

    res.json({
      provider: PROVIDER,
      mock: isMockMode(),
      connected: !!cred,
      account: cred ? maskAccount(safeDecrypt(cred.usernameEnc) ?? '') : null,
      label: cred?.accountLabel ?? null,
      lastUsedAt: cred?.lastUsedAt ?? null,
      lastError: cred?.lastError ?? null,
    });
  } catch (err) { next(err); }
};

// POST /api/loadboard/connect — store this dispatcher's own load-board login
export const connect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const label = String(req.body?.label || '').trim() || null;

    if (!username) return res.status(400).json({ error: 'Load board username is required' });

    const data = {
      provider: PROVIDER,
      accountLabel: label,
      usernameEnc: encrypt(username),
      secretEnc: encrypt(password),
      // Any stored token belongs to the previous account — drop it.
      tokenEnc: null,
      tokenExpiry: null,
      lastError: null,
    };

    await prisma.loadBoardCredential.upsert({
      where: { userId_provider: { userId, provider: PROVIDER } },
      create: { ...data, userId },
      update: data,
    });

    res.json({ connected: true, account: maskAccount(username) });
  } catch (err) { next(err); }
};

// DELETE /api/loadboard/connect
export const disconnect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    await prisma.loadBoardCredential.deleteMany({ where: { userId, provider: PROVIDER } });
    res.json({ connected: false });
  } catch (err) { next(err); }
};

// POST /api/loadboard/search
export const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const cred = await prisma.loadBoardCredential.findUnique({
      where: { userId_provider: { userId, provider: PROVIDER } },
    });
    if (!cred) {
      return res.status(412).json({ error: 'Connect your load board account first', code: 'NOT_CONNECTED' });
    }

    const b = req.body ?? {};
    const params: LoadBoardSearchParams = {
      originCity: str(b.originCity), originState: upper(b.originState),
      destCity: str(b.destCity), destState: upper(b.destState),
      radius: b.radius ? Number(b.radius) : undefined,
      equipment: str(b.equipment),
      pickupFrom: str(b.pickupFrom), pickupTo: str(b.pickupTo),
      minRate: b.minRate ? Number(b.minRate) : undefined,
      limit: Math.min(Number(b.limit) || 50, 100),
    };

    const cachedToken = cred.tokenEnc && cred.tokenExpiry
      ? { token: safeDecrypt(cred.tokenEnc) ?? '', expiresAt: cred.tokenExpiry }
      : null;

    const provider = getProvider();
    const { results, token } = await provider.search(
      { username: safeDecrypt(cred.usernameEnc) ?? '', secret: safeDecrypt(cred.secretEnc) ?? undefined },
      params,
      cachedToken?.token ? cachedToken : null,
    );

    await prisma.loadBoardCredential.update({
      where: { id: cred.id },
      data: {
        lastUsedAt: new Date(),
        lastError: null,
        ...(token ? { tokenEnc: encrypt(token.token), tokenExpiry: token.expiresAt } : {}),
      },
    });

    // Flag postings this user already pulled in, so the UI can say "Imported"
    // instead of letting them create a duplicate.
    const ids = results.map((r) => r.externalId);
    const existing = ids.length
      ? await prisma.load.findMany({
          where: { userId, externalId: { in: ids } },
          select: { externalId: true, loadNumber: true },
        })
      : [];
    const importedMap = new Map(existing.map((l) => [l.externalId!, l.loadNumber]));

    res.json({
      mock: isMockMode(),
      count: results.length,
      results: results.map((r) => ({ ...r, importedAs: importedMap.get(r.externalId) ?? null })),
    });
  } catch (err: any) {
    // Credential/config failures are the user's to fix — don't dump them into
    // the generic 500 handler where they'd look like an outage.
    if (err instanceof LoadBoardAuthError) {
      const userId = (req as any).userId;
      await prisma.loadBoardCredential
        .updateMany({ where: { userId, provider: PROVIDER }, data: { lastError: err.message, tokenEnc: null, tokenExpiry: null } })
        .catch(() => {});
      return res.status(401).json({ error: err.message, code: 'LOADBOARD_AUTH' });
    }
    if (err instanceof LoadBoardNotConfiguredError) {
      logger.warn(`Load board not configured: ${err.message}`);
      return res.status(503).json({ error: err.message, code: 'LOADBOARD_NOT_CONFIGURED' });
    }
    next(err);
  }
};

// POST /api/loadboard/import — turn one or more search results into Loads
export const importResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const incoming: LoadBoardResult[] = Array.isArray(req.body?.results)
      ? req.body.results
      : req.body?.result ? [req.body.result] : [];

    if (!incoming.length) return res.status(400).json({ error: 'No loads to import' });
    if (incoming.length > 50) return res.status(400).json({ error: 'Import up to 50 loads at a time' });

    const created: { loadNumber: string; externalId: string }[] = [];
    const skipped: { externalId: string; reason: string }[] = [];
    let counter = await prisma.load.count({ where: { userId } });

    for (const r of incoming) {
      const externalId = String(r?.externalId || '').trim();
      if (!externalId) { skipped.push({ externalId: '', reason: 'Missing load id' }); continue; }

      const dupe = await prisma.load.findFirst({ where: { userId, externalId }, select: { loadNumber: true } });
      if (dupe) { skipped.push({ externalId, reason: `Already imported as ${dupe.loadNumber}` }); continue; }

      try {
        const clientId = await resolveClient(userId, r);
        counter += 1;

        const load = await prisma.load.create({
          data: {
            loadNumber: `LD-${String(counter).padStart(5, '0')}`,
            userId, clientId,
            source: 'DAT',
            externalId,
            originCity: r.originCity || null, originState: r.originState || null,
            destCity: r.destCity || null, destState: r.destState || null,
            pickupAt: safeDate(r.pickupAt), deliveryAt: safeDate(r.deliveryAt),
            miles: r.miles ? Number(r.miles) : null,
            // Postings without a rate are a call-for-rate — import at 0 so the
            // dispatcher fills it in after negotiating rather than losing the load.
            rate: Number(r.rate || 0),
            equipment: r.equipment || null,
            weight: r.weight || null,
            commodity: r.commodity || null,
            referenceNumber: r.referenceNumber || null,
            notes: importNote(r),
          },
        });
        created.push({ loadNumber: load.loadNumber, externalId });
      } catch (e: any) {
        skipped.push({ externalId, reason: e?.message || 'Failed to import' });
      }
    }

    res.json({ created: created.length, loads: created, skipped });
  } catch (err) { next(err); }
};

// POST /api/loadboard/parse — freeform text → load form fields (paste import)
export const parseText = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const text = String(req.body?.text || '');
    if (!text.trim()) return res.status(400).json({ error: 'Paste some load details first' });
    if (text.length > 20_000) return res.status(400).json({ error: 'That text is too long to parse' });

    res.json(parseLoadText(text));
  } catch (err) { next(err); }
};

// ── helpers ──────────────────────────────────────────────────────────────────

const str = (v: any) => { const s = String(v ?? '').trim(); return s || undefined; };
const upper = (v: any) => str(v)?.toUpperCase();
const safeDate = (v: any) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

/** Ciphertext written under a different key shouldn't crash the whole request. */
const safeDecrypt = (v: string | null): string | undefined => {
  if (!v) return undefined;
  try { return decrypt(v); } catch { return undefined; }
};

/** Match the posting broker to an existing Client, else create one. */
const resolveClient = async (userId: string, r: LoadBoardResult): Promise<string> => {
  const name = (r.companyName || '').trim() || 'Unknown Broker';
  const existing = await prisma.client.findFirst({
    where: { userId, companyName: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const client = await prisma.client.create({
    data: {
      userId,
      companyName: name,
      contactPerson: name,
      email: r.contactEmail || '',
      phone: r.contactPhone || null,
      notes: 'Created automatically from a load board import.',
    },
  });
  return client.id;
};

/** Keep the posting's context on the load — it's gone from the board in an hour. */
const importNote = (r: LoadBoardResult): string | null => {
  const parts = [
    r.notes,
    r.contactPhone ? `Broker phone: ${r.contactPhone}` : null,
    r.contactEmail ? `Broker email: ${r.contactEmail}` : null,
    r.postedAt ? `Posted ${new Date(r.postedAt).toLocaleString('en-US')}` : null,
    `Imported from ${PROVIDER} · ${r.externalId}`,
  ].filter(Boolean);
  return parts.length ? parts.join('\n') : null;
};
