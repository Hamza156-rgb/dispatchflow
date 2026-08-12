import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AUTH_EXPIRED_EVENT, useAuthStore } from '../../store/authStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('df_dark') === 'true');
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Super admins only manage tenants — keep them on the admin panel.
  useEffect(() => {
    if (user?.isSuperAdmin && !location.pathname.startsWith('/admin')) {
      navigate('/admin/overview', { replace: true });
    }
  }, [user?.isSuperAdmin, location.pathname, navigate]);

  useEffect(() => {
    const handleAuthExpired = () => navigate('/login', { replace: true });
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [navigate]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('df_dark', String(darkMode));
  }, [darkMode]);

  // Close the mobile drawer whenever the route changes or we leave mobile.
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { if (!isMobile) setMobileOpen(false); }, [isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`app-shell ${darkMode ? 'dark' : ''}`} style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(c => !c)}
        mobile={isMobile}
        open={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />

      {/* Backdrop for the mobile drawer */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'var(--scrim)', zIndex: 1000,
            backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
            animation: 'fadeIn 160ms ease',
          }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--color-bg-page)' }}>
        <TopBar
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
          onLogout={handleLogout}
          showMenu={isMobile}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {/* Keyed so each route fades in rather than snapping into place. */}
          <div key={location.pathname} className="df-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
