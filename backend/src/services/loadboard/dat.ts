import { logger } from '../../utils/logger';
import {
  LoadBoardProvider,
  LoadBoardResult,
  LoadBoardSearchParams,
  LoadBoardAuthError,
  LoadBoardNotConfiguredError,
} from './types';

/**
 * DAT load board — official API.
 *
 * ⚠️  The endpoint paths and payload shapes below are written to DAT's
 * *documented* API pattern but have NOT been verified against a live account,
 * because that needs a DAT API agreement. Everything DAT-specific is confined
 * to this file and overridable by env var, so wiring up the real contract means
 * editing the constants + the two mapper functions at the bottom — no changes
 * anywhere else in the codebase.
 *
 * Auth is two-legged: the *organization* (your DAT API service account, shared
 * across DispatchFlow) mints an org token, which is then exchanged for a *user*
 * token scoped to the individual dispatcher's DAT login. That's the mechanism
 * that keeps each customer's usage on their own subscription.
 */
const CFG = {
  identityBase: process.env.DAT_IDENTITY_URL || 'https://identity.api.dat.com',
  freightBase: process.env.DAT_FREIGHT_URL || 'https://freight.api.dat.com',
  orgTokenPath: process.env.DAT_ORG_TOKEN_PATH || '/access/v1/token/organization',
  userTokenPath: process.env.DAT_USER_TOKEN_PATH || '/access/v1/token/user',
  searchPath: process.env.DAT_SEARCH_PATH || '/search/v1.1/asset/search',
  // Service-account credentials for DispatchFlow itself (from the API agreement)
  serviceUser: process.env.DAT_SERVICE_USERNAME || '',
  servicePass: process.env.DAT_SERVICE_PASSWORD || '',
  timeoutMs: Number(process.env.DAT_TIMEOUT_MS || 20_000),
};

const withTimeout = async (url: string, init: RequestInit): Promise<Response> => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CFG.timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
};

const postJson = async (url: string, body: unknown, token?: string) => {
  const res = await withTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }

  if (res.status === 401 || res.status === 403) {
    throw new LoadBoardAuthError(json?.message || 'DAT rejected these credentials');
  }
  if (!res.ok) {
    throw new Error(`DAT ${res.status}: ${json?.message || text.slice(0, 200) || 'request failed'}`);
  }
  return json;
};

/** Step 1 — DispatchFlow's own service account token. */
const getOrgToken = async (): Promise<string> => {
  if (!CFG.serviceUser || !CFG.servicePass) {
    throw new LoadBoardNotConfiguredError(
      'DAT service account is not configured. Set DAT_SERVICE_USERNAME and DAT_SERVICE_PASSWORD.',
    );
  }
  const json = await postJson(`${CFG.identityBase}${CFG.orgTokenPath}`, {
    username: CFG.serviceUser,
    password: CFG.servicePass,
  });
  const token = json?.accessToken || json?.access_token;
  if (!token) throw new Error('DAT org token response had no accessToken');
  return token;
};

/** Step 2 — exchange for a token scoped to this dispatcher's DAT login. */
const getUserToken = async (orgToken: string, username: string): Promise<{ token: string; expiresAt: Date }> => {
  const json = await postJson(`${CFG.identityBase}${CFG.userTokenPath}`, { username }, orgToken);
  const token = json?.accessToken || json?.access_token;
  if (!token) throw new LoadBoardAuthError('DAT did not issue a user token for this account');
  // DAT user tokens are short-lived; expire ours a minute early to dodge races.
  const ttlSeconds = Number(json?.expiresIn || json?.expires_in || 3600);
  return { token, expiresAt: new Date(Date.now() + (ttlSeconds - 60) * 1000) };
};

/** DispatchFlow equipment labels → DAT equipment codes. */
const EQUIPMENT_CODE: Record<string, string> = {
  'Dry Van': 'V',
  Reefer: 'R',
  Flatbed: 'F',
  'Step Deck': 'SD',
  'Power Only': 'PO',
  'Box Truck': 'SB',
  Hotshot: 'F',
};
const EQUIPMENT_LABEL: Record<string, string> = Object.entries(EQUIPMENT_CODE)
  .reduce((acc, [label, code]) => ({ ...acc, [code]: label }), {});

const toSearchBody = (p: LoadBoardSearchParams) => ({
  criteria: {
    equipmentClasses: p.equipment && EQUIPMENT_CODE[p.equipment] ? [EQUIPMENT_CODE[p.equipment]] : undefined,
    origin: p.originCity || p.originState
      ? { place: { city: p.originCity, stateProv: p.originState }, radius: p.radius ?? 100 }
      : undefined,
    destination: p.destCity || p.destState
      ? { place: { city: p.destCity, stateProv: p.destState }, radius: p.radius ?? 100 }
      : undefined,
    availability: p.pickupFrom || p.pickupTo
      ? { earliestWhen: p.pickupFrom, latestWhen: p.pickupTo }
      : undefined,
  },
  maxResults: Math.min(p.limit ?? 50, 100),
});

/** One DAT match → our normalized shape. */
const toResult = (m: any): LoadBoardResult => {
  const o = m?.matchingAssetInfo?.origin ?? m?.origin ?? {};
  const d = m?.matchingAssetInfo?.destination ?? m?.destination ?? {};
  const rate = m?.matchingAssetInfo?.rate ?? m?.rate ?? {};
  const poster = m?.posterInfo ?? m?.poster ?? {};
  const eqCode = m?.matchingAssetInfo?.equipmentType ?? m?.equipmentType;

  return {
    externalId: String(m?.matchId ?? m?.id ?? m?.assetId ?? ''),
    originCity: o.city ?? o.place?.city,
    originState: o.stateProv ?? o.place?.stateProv,
    destCity: d.city ?? d.place?.city,
    destState: d.stateProv ?? d.place?.stateProv,
    pickupAt: m?.availability?.earliestWhen ?? m?.earliestAvailability,
    deliveryAt: m?.availability?.latestWhen,
    miles: num(m?.tripLength?.miles ?? m?.mileage),
    rate: num(rate?.flatRate?.amount ?? rate?.amount ?? m?.loadRate),
    equipment: eqCode ? (EQUIPMENT_LABEL[eqCode] ?? String(eqCode)) : undefined,
    weight: m?.shipmentDetails?.maximumWeightPounds
      ? `${m.shipmentDetails.maximumWeightPounds} lbs`
      : undefined,
    commodity: m?.shipmentDetails?.commodity,
    companyName: poster?.companyName ?? poster?.name,
    contactPhone: poster?.contact?.phone ?? poster?.phone,
    contactEmail: poster?.contact?.email ?? poster?.email,
    referenceNumber: m?.referenceId ?? m?.postersReferenceId,
    postedAt: m?.postedWhen ?? m?.created,
    notes: m?.comments?.filter?.(Boolean).join(' · ') ?? m?.comment,
  };
};

const num = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export const datProvider: LoadBoardProvider = {
  name: 'DAT',

  async search(credentials, params, cachedToken) {
    let auth = cachedToken && cachedToken.expiresAt > new Date() ? cachedToken : null;

    if (!auth) {
      const orgToken = await getOrgToken();
      auth = await getUserToken(orgToken, credentials.username);
    }

    const run = (token: string) =>
      postJson(`${CFG.freightBase}${CFG.searchPath}`, toSearchBody(params), token);

    let json: any;
    try {
      json = await run(auth.token);
    } catch (err) {
      // A cached token that expired early — re-auth once, then give up.
      if (err instanceof LoadBoardAuthError && cachedToken) {
        logger.info('DAT token rejected, re-authenticating');
        const orgToken = await getOrgToken();
        auth = await getUserToken(orgToken, credentials.username);
        json = await run(auth.token);
      } else {
        throw err;
      }
    }

    const matches: any[] = json?.matches ?? json?.results ?? json?.data ?? [];
    const results = matches.map(toResult).filter((r) => r.externalId);

    return { results, token: auth };
  },
};
