import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppConfig } from '../../hooks/useApi';
import { Icon, type IconName } from '../ui/icons';

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

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Items are grouped under this heading (hidden while collapsed). */
  section: string;
}

const NAV: NavItem[] = [
  { to: '/dashboard',  label: 'Dashboard',  icon: 'dashboard', section: 'Overview' },
  { to: '/clients',    label: 'Clients',    icon: 'building',  section: 'Operations' },
  { to: '/loads',      label: 'Loads',      icon: 'truck',     section: 'Operations' },
  { to: '/load-board', label: 'Load Board', icon: 'search',    section: 'Operations' },
  { to: '/invoices',   label: 'Invoices',   icon: 'file',      section: 'Finance' },
  { to: '/reports',    label: 'Reports',    icon: 'chart',     section: 'Finance' },
  { to: '/insights',   label: 'Insights',   icon: 'sparkles',  section: 'Finance' },
  { to: '/team',       label: 'Team',       icon: 'users',     section: 'Workspace' },
  { to: '/settings',   label: 'Settings',   icon: 'settings',  section: 'Workspace' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin/overview',      label: 'Overview',      icon: 'shield',   section: 'Console' },
  { to: '/admin/organizations', label: 'Organizations', icon: 'building', section: 'Console' },
  { to: '/admin/plans',         label: 'Plans',         icon: 'card',     section: 'Console' },
];

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const clean = (name || '?').trim();
  const initials = clean.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const gradients = [
    ['#3b82f6', '#1d4ed8'], ['#8b5cf6', '#6d28d9'], ['#14b8a6', '#0f766e'],
    ['#f59e0b', '#b45309'], ['#f43f5e', '#be123c'],
  ];
  const [from, to] = gradients[clean.charCodeAt(0) % gradients.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
    }}>
      {initials}
    </div>
  );
}

export default function Sidebar({ collapsed, onCollapse, mobile = false, open = false, onNavigate }: SidebarProps) {
  const { user } = useAuthStore();
  const { data: config } = useAppConfig();
  const location = useLocation();

  // Load Board only appears where a board is actually wired up. Default to
  // hidden while config is loading so it never flashes in and out.
  const nav = NAV.filter((item) => item.to !== '/load-board' || config?.loadBoard.enabled);

  // On mobile the drawer is always full-width (never the collapsed rail).
  const isCollapsed = mobile ? false : collapsed;

  const isActive = (to: string) => {
    if (to === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(to);
  };

  const items = user?.isSuperAdmin ? ADMIN_NAV : nav;

  const mobileStyles: React.CSSProperties = mobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: 268,
        zIndex: 1001,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: open ? '8px 0 40px rgba(2,6,23,0.45)' : 'none',
      }
    : {
        width: isCollapsed ? 72 : 248,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
      };

  return (
    <aside style={{
      flexShrink: 0,
      background: 'linear-gradient(180deg, var(--sidebar-bg-2) 0%, var(--sidebar-bg) 42%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: '1px solid var(--sidebar-border)',
      ...mobileStyles,
    }}>
      {/* Brand */}
      <div style={{
        padding: isCollapsed ? '0 16px' : '0 18px', display: 'flex', alignItems: 'center', gap: 11,
        borderBottom: '1px solid var(--sidebar-border)', height: 64, flexShrink: 0,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0, color: '#fff',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(37,99,235,0.45), inset 0 0 0 1px rgba(255,255,255,0.18)',
        }}>
          <Icon name="truck" size={19} />
        </div>
        {!isCollapsed && (
          <span style={{
            color: 'var(--sidebar-text)', fontWeight: 800, fontSize: 17,
            letterSpacing: '-0.03em', whiteSpace: 'nowrap', lineHeight: 1,
          }}>
            Dispatch<span style={{ color: 'var(--sidebar-accent)' }}>Flow</span>
          </span>
        )}
        {mobile && (
          <button onClick={onNavigate} aria-label="Close menu"
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--sidebar-muted)',
              cursor: 'pointer', lineHeight: 0, padding: 6, borderRadius: 8,
            }}>
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: isCollapsed ? '12px 12px' : '12px 12px', overflowY: 'auto' }}>
        {items.map((item, i) => {
          const active = isActive(item.to);
          const newSection = i === 0 || items[i - 1].section !== item.section;
          return (
            <div key={item.to}>
              {newSection && !isCollapsed && (
                <div style={{
                  padding: i === 0 ? '4px 12px 7px' : '16px 12px 7px',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: '#5b6b85',
                }}>
                  {item.section}
                </div>
              )}
              {newSection && isCollapsed && i > 0 && (
                <div style={{ height: 1, background: 'var(--sidebar-border)', margin: '10px 6px' }} />
              )}
              <NavLink
                to={item.to}
                onClick={onNavigate}
                title={isCollapsed ? item.label : undefined}
                className={`df-nav-item ${active ? 'is-active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: isCollapsed ? '10px 0' : '9px 12px',
                  borderRadius: 10, border: 'none', textDecoration: 'none',
                  background: active ? 'var(--sidebar-item-active)' : 'transparent',
                  color: active ? '#ffffff' : 'var(--sidebar-muted)',
                  transition: 'background 150ms, color 150ms',
                  marginBottom: 2,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  boxShadow: active ? 'inset 0 0 0 1px rgba(96,165,250,0.16)' : 'none',
                }}
              >
                <span style={{ color: active ? 'var(--sidebar-accent)' : 'inherit', lineHeight: 0 }}>
                  <Icon name={item.icon} size={18} />
                </span>
                {!isCollapsed && (
                  <span style={{ fontWeight: active ? 650 : 550, fontSize: 13.5, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div style={{ padding: isCollapsed ? '10px 12px' : '12px', borderTop: '1px solid var(--sidebar-border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: isCollapsed ? 0 : '9px 10px', borderRadius: 12,
            background: isCollapsed ? 'transparent' : 'rgba(255,255,255,0.04)',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}>
            <Avatar name={user.fullName} size={isCollapsed ? 32 : 34} />
            {!isCollapsed && (
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div style={{
                  color: 'var(--sidebar-text)', fontWeight: 600, fontSize: 13,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user.fullName}
                </div>
                <div style={{
                  color: 'var(--sidebar-muted)', fontSize: 11.5, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user.companyName}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapse — desktop only */}
      {!mobile && (
        <button onClick={onCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="df-nav-item"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px', background: 'transparent', border: 'none',
            borderTop: '1px solid var(--sidebar-border)', color: 'var(--sidebar-muted)',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
          }}>
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
          {!collapsed && <span>Collapse</span>}
        </button>
      )}
    </aside>
  );
}
