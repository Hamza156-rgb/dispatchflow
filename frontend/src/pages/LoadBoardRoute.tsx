import { Navigate } from 'react-router-dom';
import { useAppConfig } from '../hooks/useApi';
import LoadBoardPage from './LoadBoardPage';

/**
 * Renders the load board only where this deployment has it turned on.
 *
 * The check lives here rather than in `App` so the router — and therefore the
 * public landing page — doesn't have to pull in the API layer (axios included)
 * just to read one feature flag.
 */
export default function LoadBoardRoute() {
  const { data: config, isError } = useAppConfig();
  // If config can't be fetched, treat optional features as off rather than
  // leaving the route stuck waiting on an answer that isn't coming.
  const enabled = isError ? false : config?.loadBoard.enabled;

  // While config loads, `enabled` is undefined — wait rather than bouncing the
  // user off a page they're allowed to see.
  if (enabled === undefined) return null;
  if (!enabled) return <Navigate to="/loads" replace />;
  return <LoadBoardPage />;
}
