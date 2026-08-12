import { useLocation } from 'react-router-dom';
import { Icon } from '../ui/icons';

interface TopBarProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  /** Show the hamburger menu button (mobile only). */
  showMenu?: boolean;
  onOpenMenu?: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/loads': 'Loads',
  '/load-board': 'Load Board',
  '/invoices': 'Invoices',
  '/invoices/new': 'Create Invoice',
  '/reports': 'Reports',
  '/insights': 'Smart Insights',
  '/team': 'Team',
  '/admin': 'Super Admin',
  '/settings': 'Settings',
};

export default function TopBar({ darkMode, onToggleDark, onLogout, showMenu, onOpenMenu }: TopBarProps) {
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
      gap: 12,
      padding: showMenu ? '0 16px' : '0 26px',
      background: 'var(--color-bg)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {showMenu && (
          <button onClick={onOpenMenu} aria-label="Open menu" className="df-icon-btn" style={{ padding: 8 }}>
            <Icon name="menu" size={18} />
          </button>
        )}
        <h1 style={{
          margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text)',
          letterSpacing: '-0.025em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Theme toggle */}
        <button
          onClick={onToggleDark}
          className="df-icon-btn"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Light mode' : 'Dark mode'}
          style={{ padding: 8 }}
        >
          <Icon name={darkMode ? 'sun' : 'moon'} size={17} />
        </button>

        {/* Divider */}
        <span style={{ width: 1, height: 22, background: 'var(--color-border)', margin: '0 2px' }} />

        {/* Logout */}
        <button
          onClick={onLogout}
          className="df-icon-btn"
          style={{
            padding: '7px 14px', gap: 7, fontWeight: 600, fontSize: 13,
            fontFamily: 'inherit', borderRadius: 10,
          }}
        >
          <Icon name="logout" size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
