import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useAppConfig } from './hooks/useApi';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import ReportsPage from './pages/ReportsPage';
import InsightsPage from './pages/InsightsPage';
import LoadsPage from './pages/LoadsPage';
import LoadBoardPage from './pages/LoadBoardPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import TeamPage from './pages/TeamPage';
import AdminPage from './pages/AdminPage';
import AccountGate from './pages/AccountGate';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  // Gate non-active workspaces (super admins always pass)
  if (user && !user.isSuperAdmin && user.accountStatus && user.accountStatus !== 'ACTIVE') {
    return <AccountGate status={user.accountStatus as 'PENDING' | 'SUSPENDED'} />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Renders a page only where this deployment has the feature turned on. */
function FeatureRoute({ enabled, children }: { enabled?: boolean; children: React.ReactNode }) {
  // While config loads, `enabled` is undefined — wait rather than bouncing the
  // user off a page they're allowed to see.
  if (enabled === undefined) return null;
  if (!enabled) return <Navigate to="/loads" replace />;
  return <>{children}</>;
}

export default function App() {
  const { data: config, isError } = useAppConfig();
  // If config can't be fetched, treat optional features as off rather than
  // leaving the route stuck waiting on an answer that isn't coming.
  const loadBoardEnabled = isError ? false : config?.loadBoard.enabled;

  return (
    <Routes>
      {/* Public marketing site */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected app */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/loads" element={<LoadsPage />} />
        <Route path="/load-board" element={
          <FeatureRoute enabled={loadBoardEnabled}><LoadBoardPage /></FeatureRoute>
        } />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/new" element={<CreateInvoicePage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
        <Route path="/admin/overview" element={<AdminPage />} />
        <Route path="/admin/organizations" element={<AdminPage />} />
        <Route path="/admin/plans" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback → public homepage */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
