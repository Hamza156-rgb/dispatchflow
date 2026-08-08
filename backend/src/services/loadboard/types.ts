// Shared contract for every load-board provider (DAT today; Truckstop /
// 123Loadboard slot in behind the same interface).

export interface LoadBoardSearchParams {
  originCity?: string;
  originState?: string;
  destCity?: string;
  destState?: string;
  /** Miles around the origin to include. */
  radius?: number;
  equipment?: string;
  /** Earliest pickup date, ISO. */
  pickupFrom?: string;
  pickupTo?: string;
  minRate?: number;
  limit?: number;
}

/** A search hit, normalized to DispatchFlow's vocabulary. */
export interface LoadBoardResult {
  /** Provider's id for this posting — the dedupe key on import. */
  externalId: string;
  originCity?: string;
  originState?: string;
  destCity?: string;
  destState?: string;
  pickupAt?: string;
  deliveryAt?: string;
  miles?: number;
  /** Posted/offered rate. Many postings have none — the broker wants a call. */
  rate?: number;
  equipment?: string;
  weight?: string;
  commodity?: string;
  /** Posting broker — becomes the Client on import. */
  companyName?: string;
  contactPhone?: string;
  contactEmail?: string;
  referenceNumber?: string;
  /** Age of the posting, for the "posted 12m ago" column. */
  postedAt?: string;
  notes?: string;
}

export interface LoadBoardProvider {
  readonly name: string;
  /**
   * Exchange stored credentials for whatever the provider needs, then search.
   * Implementations should surface auth failures as LoadBoardAuthError so the
   * controller can flag the connection as broken instead of 500ing.
   */
  search(
    /** `secret` is optional: DAT's org-vouched flow needs only the username. */
    credentials: { username: string; secret?: string },
    params: LoadBoardSearchParams,
    /** Cached token from a previous call, if still valid. */
    cachedToken?: { token: string; expiresAt: Date } | null,
  ): Promise<{ results: LoadBoardResult[]; token?: { token: string; expiresAt: Date } }>;
}

/** Credentials were rejected — the user must reconnect. */
export class LoadBoardAuthError extends Error {
  constructor(message = 'Load board rejected these credentials') {
    super(message);
    this.name = 'LoadBoardAuthError';
  }
}

/** Provider is selected but not configured with real endpoints yet. */
export class LoadBoardNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoadBoardNotConfiguredError';
  }
}
