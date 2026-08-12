import React from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './icons';

export { Icon };
export type { IconName };

// ─── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Optional leading icon, rendered before the label. */
  icon?: IconName;
}

const btnStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-primary)', color: 'var(--color-on-primary)',
    border: '1px solid transparent', boxShadow: '0 1px 2px rgba(13,21,38,0.14)',
  },
  secondary: {
    background: 'var(--color-bg)', color: 'var(--color-text)',
    border: '1px solid var(--color-border-strong)', boxShadow: 'var(--shadow-xs)',
  },
  danger: {
    background: '#e11d48', color: '#fff',
    border: '1px solid transparent', boxShadow: '0 1px 2px rgba(13,21,38,0.14)',
  },
  success: {
    background: '#16a34a', color: '#fff',
    border: '1px solid transparent', boxShadow: '0 1px 2px rgba(13,21,38,0.14)',
  },
  ghost: {
    background: 'transparent', color: 'var(--color-muted)',
    border: '1px solid transparent', boxShadow: 'none',
  },
};

const btnSizes: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 12.5, borderRadius: 8, gap: 6 },
  md: { padding: '9px 16px', fontSize: 13.5, borderRadius: 10, gap: 7 },
  lg: { padding: '12px 22px', fontSize: 15, borderRadius: 12, gap: 8 },
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, disabled, style, className = '', ...props
}: ButtonProps) {
  const off = disabled || loading;
  return (
    <button
      disabled={off}
      className={`df-btn df-btn--${variant} ${className}`.trim()}
      style={{
        fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.35,
        cursor: off ? 'not-allowed' : 'pointer',
        opacity: off ? 0.55 : 1,
        transition: 'background 160ms, border-color 160ms, box-shadow 160ms, transform 120ms, filter 160ms',
        fontFamily: 'inherit', whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        ...btnStyles[variant], ...btnSizes[size], ...style,
      }}
      {...props}
    >
      {loading
        ? <Spin size={ICON_SIZE[size]} />
        : icon && <Icon name={icon} size={ICON_SIZE[size]} />}
      {children}
    </button>
  );
}

/** Inline spinner used inside buttons. */
function Spin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// ─── IconButton ───────────────────────────────────────────────────────────────
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  size?: number;
  tone?: 'default' | 'danger';
}

export function IconButton({ icon, size = 16, tone = 'default', style, className = '', ...props }: IconButtonProps) {
  return (
    <button
      className={`df-icon-btn ${tone === 'danger' ? 'is-danger' : ''} ${className}`.trim()}
      style={{ padding: 7, lineHeight: 0, ...style }}
      {...props}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  /** Marks the field invalid (red border) without printing a message — use when
   *  the surrounding FormField already renders the error text. */
  invalid?: boolean;
  /** Renders a leading icon inside the field. */
  icon?: IconName;
}

const fieldBase: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 10, fontSize: 13.5,
  background: 'var(--color-bg)', color: 'var(--color-text)',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  boxShadow: 'var(--shadow-xs)',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, invalid, icon, style, ...props }, ref,
) {
  const bad = !!error || !!invalid;
  const field = (
    <input
      ref={ref}
      aria-invalid={bad || undefined}
      style={{
        ...fieldBase,
        border: `1px solid ${bad ? 'var(--color-danger)' : 'var(--color-border-strong)'}`,
        paddingLeft: icon ? 36 : 13,
        ...style,
      }}
      {...props}
    />
  );

  return (
    <div>
      {icon ? (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 12, color: 'var(--color-faint)', pointerEvents: 'none', lineHeight: 0 }}>
            <Icon name={icon} size={15} />
          </span>
          {field}
        </div>
      ) : field}
      {error && <FieldError message={error} />}
    </div>
  );
});

// ─── PasswordInput ────────────────────────────────────────────────────────────
interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string;
  invalid?: boolean;
  /** Start revealed. Used where the value exists to be read back and passed on
   *  (e.g. a temporary password an owner hands to a new team member). */
  defaultVisible?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ error, invalid, defaultVisible = false, style, ...props }, ref) {
    const [visible, setVisible] = React.useState(defaultVisible);
    const bad = !!error || !!invalid;

    return (
      <div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            aria-invalid={bad || undefined}
            style={{
              ...fieldBase,
              border: `1px solid ${bad ? 'var(--color-danger)' : 'var(--color-border-strong)'}`,
              paddingRight: 42,
              ...style,
            }}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            title={visible ? 'Hide password' : 'Show password'}
            className="df-icon-btn"
            style={{
              position: 'absolute', right: 5, border: 'none', background: 'transparent',
              padding: 6, boxShadow: 'none',
            }}
          >
            <Icon name={visible ? 'eye-off' : 'eye'} size={16} />
          </button>
        </div>
        {error && <FieldError message={error} />}
      </div>
    );
  },
);

// ─── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ style, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        style={{
          ...fieldBase,
          border: '1px solid var(--color-border-strong)',
          padding: '10px 13px', lineHeight: 1.55, resize: 'vertical', minHeight: 76,
          ...style,
        }}
        {...props}
      />
    );
  },
);

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ style, children, ...props }, ref) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <select
          ref={ref}
          style={{
            ...fieldBase,
            border: '1px solid var(--color-border-strong)',
            appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
            paddingRight: 34, cursor: 'pointer', fontWeight: 500,
            ...style,
          }}
          {...props}
        >
          {children}
        </select>
        <span style={{
          position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--color-faint)', pointerEvents: 'none', lineHeight: 0,
        }}>
          <Icon name="chevron-down" size={15} />
        </span>
      </div>
    );
  },
);

// ─── FormField ────────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  /** Optional helper copy shown under the label. */
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ label, required, error, hint, children }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 16, minWidth: 0 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7,
        fontSize: 11.5, fontWeight: 700, color: 'var(--color-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
        {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
      {hint && <p style={{ margin: '-3px 0 7px', fontSize: 12, color: 'var(--color-faint)' }}>{hint}</p>}
      {children}
      {error && <FieldError message={error} />}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p style={{
      margin: '6px 0 0', fontSize: 12, color: 'var(--color-danger)',
      display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500,
    }}>
      <Icon name="alert" size={13} />
      {message}
    </p>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds interior padding. Pass a number for a custom amount. */
  padded?: boolean | number;
  /** Subtle hover lift — use for clickable cards. */
  hoverable?: boolean;
}

export function Card({ padded, hoverable, style, className = '', children, ...rest }: CardProps) {
  const pad = padded === true ? 22 : typeof padded === 'number' ? padded : 0;
  return (
    <div
      className={`df-card ${hoverable ? 'df-lift' : ''} ${className}`.trim()}
      style={{ padding: pad, overflow: 'hidden', ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Header strip for a Card — title on the left, actions on the right. */
export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '15px 20px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>{title}</h3>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--color-muted)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action, icon }: {
  title: string; subtitle?: string; action?: React.ReactNode; icon?: IconName;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, marginBottom: 22, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'var(--color-primary-soft)', color: 'var(--color-primary)',
            border: '1px solid var(--color-primary-line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={icon} size={20} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 750, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          {subtitle && <p style={{ margin: '3px 0 0', color: 'var(--color-muted)', fontSize: 13.5 }}>{subtitle}</p>}
        </div>
      </div>
      {action && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{action}</div>}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'violet' | 'neutral';

const TONES: Record<StatTone, { fg: string; soft: string; line: string }> = {
  primary: { fg: 'var(--color-primary)', soft: 'var(--color-primary-soft)', line: 'var(--color-primary-line)' },
  success: { fg: 'var(--color-success)', soft: 'var(--color-success-soft)', line: 'var(--color-success-line)' },
  warning: { fg: 'var(--color-warning)', soft: 'var(--color-warning-soft)', line: 'var(--color-warning-line)' },
  danger:  { fg: 'var(--color-danger)',  soft: 'var(--color-danger-soft)',  line: 'var(--color-danger-line)'  },
  violet:  { fg: 'var(--color-violet)',  soft: 'var(--color-violet-soft)',  line: 'var(--color-violet-line)'  },
  neutral: { fg: 'var(--color-muted)',   soft: 'var(--color-neutral-soft)', line: 'var(--color-neutral-line)' },
};

export function StatCard({ icon, label, value, tone = 'neutral', hint, valueColor }: {
  icon: IconName;
  label: string;
  value: string;
  tone?: StatTone;
  hint?: string;
  /** Override the value colour (defaults to primary text). */
  valueColor?: string;
}) {
  const t = TONES[tone];
  return (
    <div className="df-card df-lift" style={{ padding: '17px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 13, flexShrink: 0,
        background: t.soft, color: t.fg, border: `1px solid ${t.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={21} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--color-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label}
        </div>
        <div className="df-num" style={{
          fontSize: 23, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 2,
          color: valueColor ?? 'var(--color-text)', whiteSpace: 'nowrap',
        }}>
          {value}
        </div>
        {hint && <div style={{ fontSize: 11.5, color: 'var(--color-faint)', marginTop: 1 }}>{hint}</div>}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
  /** Optional line under the title. */
  subtitle?: string;
}

export function Modal({ open, onClose, title, subtitle, children, width = 600 }: ModalProps) {
  // Escape to dismiss + lock the page behind the dialog while it is open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Rendered into <body> so the dialog is always positioned against the viewport,
  // never against a transformed/animated ancestor further up the page.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, background: 'var(--scrim)', zIndex: 9000,
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        animation: 'fadeInFlat 160ms var(--ease)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--color-bg)', borderRadius: 18, width: '100%', maxWidth: width,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)',
        animation: 'scaleIn 180ms var(--ease)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
          padding: '18px 22px', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 750, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              {title}
            </h2>
            {subtitle && <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--color-muted)' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="df-icon-btn"
            style={{ padding: 6, border: 'none', background: 'transparent', flexShrink: 0 }}>
            <Icon name="close" size={17} />
          </button>
        </div>
        <div style={{ padding: 22, overflow: 'auto' }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
type BadgeTone = { fg: string; bg: string; line: string };

const STATUS_TONES: Record<string, BadgeTone> = {
  DRAFT:     { fg: 'var(--color-muted)',   bg: 'var(--color-neutral-soft)', line: 'var(--color-neutral-line)' },
  SENT:      { fg: 'var(--color-info)',    bg: 'var(--color-info-soft)',    line: 'var(--color-info-line)' },
  PAID:      { fg: 'var(--color-success)', bg: 'var(--color-success-soft)', line: 'var(--color-success-line)' },
  OVERDUE:   { fg: 'var(--color-danger)',  bg: 'var(--color-danger-soft)',  line: 'var(--color-danger-line)' },
  CANCELLED: { fg: 'var(--color-faint)',   bg: 'var(--color-neutral-soft)', line: 'var(--color-neutral-line)' },
};

/** Soft pill with a status dot — reads clearly in both themes. */
export function Badge({ label, tone, dot = true }: { label: string; tone: BadgeTone; dot?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: dot ? '3px 10px 3px 8px' : '3px 10px',
      borderRadius: 999, fontSize: 11.5, fontWeight: 650, lineHeight: 1.6,
      color: tone.fg, background: tone.bg, border: `1px solid ${tone.line}`,
      letterSpacing: '0.01em', whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />}
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? STATUS_TONES.DRAFT;
  return <Badge label={status.charAt(0) + status.slice(1).toLowerCase()} tone={tone} />;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  ['#3b82f6', '#1d4ed8'],
  ['#8b5cf6', '#6d28d9'],
  ['#14b8a6', '#0f766e'],
  ['#f59e0b', '#b45309'],
  ['#f43f5e', '#be123c'],
  ['#06b6d4', '#0e7490'],
  ['#10b981', '#047857'],
];

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const clean = (name || '?').trim();
  const initials = clean.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const [from, to] = AVATAR_GRADIENTS[clean.charCodeAt(0) % AVATAR_GRADIENTS.length];
  return (
    <div
      title={clean}
      style={{
        width: size, height: size, borderRadius: size <= 34 ? 9 : 12, flexShrink: 0,
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: Math.max(10, size * 0.36),
        letterSpacing: '0.01em', userSelect: 'none',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.16), 0 1px 2px rgba(13,21,38,0.18)',
      }}
    >
      {initials}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const TOAST_TONES: Record<NonNullable<ToastProps['type']>, { fg: string; icon: IconName }> = {
  success: { fg: 'var(--color-success)', icon: 'check-circle' },
  error:   { fg: 'var(--color-danger)',  icon: 'alert' },
  info:    { fg: 'var(--color-info)',    icon: 'info' },
};

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  const t = TOAST_TONES[type];

  React.useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Portalled for the same reason as Modal — it must anchor to the viewport.
  return createPortal(
    <div
      role="status"
      style={{
        position: 'fixed', top: 78, right: 20, zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 11, maxWidth: 400,
        background: 'var(--color-bg)', color: 'var(--color-text)',
        padding: '12px 14px', borderRadius: 12, fontWeight: 500, fontSize: 13.5,
        border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)',
        animation: 'slideIn 200ms var(--ease)',
      }}
    >
      <span style={{ color: t.fg, lineHeight: 0, flexShrink: 0 }}><Icon name={t.icon} size={19} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
      <button onClick={onClose} aria-label="Dismiss" className="df-icon-btn"
        style={{ border: 'none', background: 'transparent', padding: 4, flexShrink: 0 }}>
        <Icon name="close" size={14} />
      </button>
    </div>,
    document.body,
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 62, height: 62, borderRadius: 18, marginBottom: 18,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 27, color: 'var(--color-faint)',
      }}>
        {typeof icon === 'string' && /^[a-z-]+$/.test(icon)
          ? <Icon name={icon as IconName} size={26} />
          : icon}
      </div>
      <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, letterSpacing: '-0.015em' }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 13.5, color: 'var(--color-muted)', maxWidth: 340, marginBottom: 22, lineHeight: 1.6 }}>
          {description}
        </div>
      )}
      {action}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 26 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--color-primary)' }}>
      <Spin size={size} />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ width = '100%', height = 14, radius = 8, style }: {
  width?: number | string; height?: number | string; radius?: number; style?: React.CSSProperties;
}) {
  return <div className="df-skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onChange }: {
  page: number; totalPages: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Windowed page numbers around the current page, with ellipses at the edges.
  const pages: (number | '…')[] = [];
  const push = (n: number | '…') => pages.push(n);
  const span = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - span && i <= page + span)) push(i);
    else if (pages[pages.length - 1] !== '…') push('…');
  }

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '6px 10px', opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '14px 16px', flexWrap: 'wrap',
    }}>
      <button className="df-icon-btn" onClick={() => onChange(page - 1)} disabled={page === 1}
        aria-label="Previous page" style={navBtn(page === 1)}>
        <Icon name="chevron-left" size={15} />
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} style={{ padding: '0 4px', color: 'var(--color-faint)', fontSize: 13 }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={p === page ? '' : 'df-icon-btn'}
            style={{
              minWidth: 32, padding: '6px 9px', fontSize: 13, fontWeight: 650, borderRadius: 8,
              cursor: 'pointer', fontFamily: 'inherit',
              ...(p === page
                ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: '1px solid transparent' }
                : {}),
            }}
          >
            {p}
          </button>
        ),
      )}

      <button className="df-icon-btn" onClick={() => onChange(page + 1)} disabled={page === totalPages}
        aria-label="Next page" style={navBtn(page === totalPages)}>
        <Icon name="chevron-right" size={15} />
      </button>
    </div>
  );
}
