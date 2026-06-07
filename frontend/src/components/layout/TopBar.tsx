import { useLocation } from 'react-router-dom';

interface TopBarProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/invoices': 'Invoices',
  '/invoices/new': 'Create Invoice',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function TopBar({ darkMode, onToggleDark, onLogout }: TopBarProps) {
  const { pathname } = useLocation();

  const title = Object.entries(PAGE_TITLES)
    .find(([path]) => pathname === path || (path !== '/dashboard' && pathname.startsWith(path)))?.[1]
    ?? 'DispatchFlow';

  return (
    <header style={{
      height: 64,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      background: 'var(--color-bg)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--color-text)',
        letterSpacing: '-0.3px' }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Dark mode toggle */}
        <button onClick={onToggleDark}
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 15,
            display: 'flex', alignItems: 'center' }}>
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Logout */}
        <button onClick={onLogout}
          style={{ background: 'transparent', border: '1.5px solid var(--color-border)',
            borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontWeight: 600,
            fontSize: 13, color: 'var(--color-muted)', fontFamily: 'inherit' }}>
          Sign out
        </button>
      </div>
    </header>
  );
}
