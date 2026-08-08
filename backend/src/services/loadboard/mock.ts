import { LoadBoardProvider, LoadBoardResult, LoadBoardSearchParams } from './types';

/**
 * Deterministic fake load board. Runs when LOADBOARD_PROVIDER=mock (the
 * default) so the whole Load Board feature — search, filters, import, dedupe —
 * is testable before DAT API credentials exist. Swap the env var to `dat` and
 * the same UI talks to the real thing.
 */
const BROKERS = [
  'Midwest Freight Partners', 'Great Lakes Logistics', 'Redline Transport Brokers',
  'Sunbelt Cargo Group', 'Ironhorse Shipping', 'Cascade Freight Services',
];
const LANES = [
  { oc: 'Chicago', os: 'IL', dc: 'Indianapolis', ds: 'IN', mi: 184 },
  { oc: 'Chicago', os: 'IL', dc: 'Columbus', ds: 'OH', mi: 356 },
  { oc: 'Dallas', os: 'TX', dc: 'Houston', ds: 'TX', mi: 239 },
  { oc: 'Atlanta', os: 'GA', dc: 'Charlotte', ds: 'NC', mi: 245 },
  { oc: 'Los Angeles', os: 'CA', dc: 'Phoenix', ds: 'AZ', mi: 373 },
  { oc: 'Newark', os: 'NJ', dc: 'Boston', ds: 'MA', mi: 224 },
  { oc: 'Memphis', os: 'TN', dc: 'Nashville', ds: 'TN', mi: 212 },
  { oc: 'Denver', os: 'CO', dc: 'Salt Lake City', ds: 'UT', mi: 521 },
];
const EQUIPMENT = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Power Only'];
const COMMODITIES = ['Palletized goods', 'Produce', 'Steel coils', 'Machinery', 'Paper products', 'Beverages'];

const matchesText = (a?: string, b?: string) =>
  !b || (a ?? '').toLowerCase().includes(b.toLowerCase());

export const mockProvider: LoadBoardProvider = {
  name: 'MOCK',

  async search(_credentials, params: LoadBoardSearchParams) {
    const now = Date.now();
    const results: LoadBoardResult[] = [];

    for (let i = 0; i < 28; i++) {
      const lane = LANES[i % LANES.length];
      const equipment = EQUIPMENT[i % EQUIPMENT.length];
      // Rate wanders around $2.05/mi so the $/mi column shows realistic spread.
      const perMile = 1.75 + ((i * 7) % 11) * 0.06;
      const pickup = new Date(now + (i % 5) * 86_400_000 + 9 * 3_600_000);

      results.push({
        externalId: `MOCK-${lane.oc.slice(0, 3).toUpperCase()}-${1000 + i}`,
        originCity: lane.oc, originState: lane.os,
        destCity: lane.dc, destState: lane.ds,
        pickupAt: pickup.toISOString(),
        deliveryAt: new Date(pickup.getTime() + 86_400_000).toISOString(),
        miles: lane.mi,
        rate: Math.round((lane.mi * perMile) / 25) * 25,
        equipment,
        weight: `${20_000 + (i % 6) * 3_000} lbs`,
        commodity: COMMODITIES[i % COMMODITIES.length],
        companyName: BROKERS[i % BROKERS.length],
        contactPhone: `(${300 + (i % 60)}) 555-0${100 + i}`,
        contactEmail: `dispatch@${BROKERS[i % BROKERS.length].split(' ')[0].toLowerCase()}.example`,
        referenceNumber: `REF-${8000 + i}`,
        postedAt: new Date(now - (i % 9) * 1_800_000).toISOString(),
        notes: i % 4 === 0 ? 'No-touch freight. Driver assist not required.' : undefined,
      });
    }

    const filtered = results.filter((r) =>
      matchesText(r.originCity, params.originCity) &&
      matchesText(r.originState, params.originState) &&
      matchesText(r.destCity, params.destCity) &&
      matchesText(r.destState, params.destState) &&
      (!params.equipment || r.equipment === params.equipment) &&
      (!params.minRate || (r.rate ?? 0) >= params.minRate)
    );

    return { results: filtered.slice(0, params.limit ?? 50) };
  },
};
