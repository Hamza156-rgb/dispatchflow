import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: () => void;
  /** Mobile drawer mode — renders as an off-canvas overlay. */
  mobile?: boolean;
  /** Whether the mobile drawer is open. */
  open?: boolean;
  /** Called when a nav item is tapped (used to close the mobile drawer). */
  onNavigate?: () => void;
}

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/clients', label: 'Clients', icon: '🏢' },
  { to: '/loads', label: 'Loads', icon: '🚚' },
  { to: '/invoices', label: 'Invoices', icon: '📄' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/insights', label: 'Insights', icon: '✨' },
  { to: '/team', label: 'Team', icon: '👥' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

const ADMIN_NAV = { to: '/admin', label: 'Super Admin', icon: '🛡️' };

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#2563eb', '#7c3aed', '#0f766e', '#b45309', '#be123c'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

export default function Sidebar({ collapsed, onCollapse, mobile = false, open = false, onNavigate }: SidebarProps) {
  const { user } = useAuthStore();
  const location = useLocation();

  // On mobile the drawer is always full-width (never the collapsed rail).
  const isCollapsed = mobile ? false : collapsed;

  const isActive = (to: string) => {
    if (to === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(to);
  };

  const mobileStyles: React.CSSProperties = mobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: 264,
        zIndex: 1001,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        boxShadow: open ? '4px 0 24px rgba(0,0,0,0.25)' : 'none',
      }
    : {
        width: isCollapsed ? 64 : 240,
        transition: 'width 0.2s ease',
      };

  return (
    <aside style={{
      flexShrink: 0,
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: '1px solid #1e293b',
      ...mobileStyles,
    }}>
      {/* Logo */}
      <div style={{ padding: isCollapsed ? '18px 16px' : '18px 20px', display: 'flex',
        alignItems: 'center', gap: 12, borderBottom: '1px solid #1e293b', minHeight: 68 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#2563eb', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🚛</div>
        {!isCollapsed && (
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: '-0.5px',
            whiteSpace: 'nowrap', lineHeight: 1 }}>
            Dispatch<span style={{ color: '#60a5fa' }}>Flow</span>
          </span>
        )}
        {mobile && (
          <button onClick={onNavigate} aria-label="Close menu"
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#94a3b8',
              fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        {(user?.isSuperAdmin ? [...NAV, ADMIN_NAV] : NAV).map(item => (
          <NavLink key={item.to} to={item.to}
            onClick={onNavigate}
            title={isCollapsed ? item.label : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isCollapsed ? '11px 16px' : '10px 14px',
              borderRadius: 10, border: 'none', textDecoration: 'none',
              background: isActive(item.to) ? '#1e3a5f' : 'transparent',
              color: isActive(item.to) ? '#60a5fa' : '#94a3b8',
              transition: 'all 0.15s', marginBottom: 2,
              justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
            {!isCollapsed && (
              <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: isCollapsed ? '14px 12px' : '14px 16px', borderTop: '1px solid #1e293b' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={user.fullName} size={32} />
            {!isCollapsed && (
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.fullName}
                </div>
                <div style={{ color: '#475569', fontSize: 11, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.companyName}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapse — desktop only */}
      {!mobile && (
        <button onClick={onCollapse}
          style={{ padding: '11px', background: 'transparent', border: 'none',
            borderTop: '1px solid #1e293b', color: '#475569', cursor: 'pointer',
            fontSize: 16, transition: 'color 0.15s' }}>
          {collapsed ? '→' : '←'}
        </button>
      )}
    </aside>
  );
}
