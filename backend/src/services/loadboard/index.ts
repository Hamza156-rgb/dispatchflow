import { datProvider } from './dat';
import { mockProvider } from './mock';
import { LoadBoardProvider } from './types';

export * from './types';

/**
 * Which board we talk to. `mock` (default) serves synthetic postings so the
 * feature is usable before the DAT API agreement lands; `dat` hits the real
 * API. Adding Truckstop/123Loadboard later means one more case here.
 */
export const getProvider = (): LoadBoardProvider => {
  switch ((process.env.LOADBOARD_PROVIDER || 'mock').toLowerCase()) {
    case 'dat':
      return datProvider;
    default:
      return mockProvider;
  }
};

/** True when we're serving fake data — the UI shows a banner saying so. */
export const isMockMode = () => (process.env.LOADBOARD_PROVIDER || 'mock').toLowerCase() !== 'dat';

/**
 * Whether the Load Board feature is exposed at all. Off by default so we never
 * ship a page that asks customers for a real load-board password it can't use.
 *
 * Pointing at a live provider turns it on automatically; LOADBOARD_ENABLED=true
 * additionally lets us run the page against mock data for demos and local work.
 */
export const isLoadBoardEnabled = () =>
  process.env.LOADBOARD_ENABLED === 'true' || !isMockMode();
