import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LandingPage from './pages/LandingPage';

// The marketing page is the entry point for anonymous visitors, so it stays in
// the initial bundle. Everything behind it is split out — statically importing
// the app pages here pulled the whole product (recharts included) into the
// first load of `/`.
const Layout = lazy(() => import('./components/layout/Layout'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetailPage'));
const CreateInvoicePage = lazy(() => import('./pages/CreateInvoicePage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const LoadsPage = lazy(() => import('./pages/LoadsPage'));
const LoadBoardRoute = lazy(() => import('./pages/LoadBoardRoute'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AccountGate = lazy(() => import('./pages/AccountGate'));

/** Neutral placeholder shown while a route chunk is in flight. */
function RouteFallback() {
  return <div style={{ minHeight: '100vh', background: 'var(--color-bg-page)' }} />;
}

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
  const { token, user } = useAuthStore();
  // Super admins have no workspace of their own — land them on the console
  // instead of bouncing them through the dashboard.
  if (token) return <Navigate to={user?.isSuperAdmin ? '/admin/overview' : '/dashboard'} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
          <Route path="/load-board" element={<LoadBoardRoute />} />
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
    </Suspense>
  );
}
