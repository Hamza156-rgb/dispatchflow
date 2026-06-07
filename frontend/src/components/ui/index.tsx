import React from 'react';

// ─── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const btnStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: '#2563eb', color: '#fff', border: 'none' },
  secondary: { background: 'transparent', color: 'var(--color-text)', border: '1.5px solid var(--color-border)' },
  danger:    { background: '#ef4444', color: '#fff', border: 'none' },
  success:   { background: '#16a34a', color: '#fff', border: 'none' },
  ghost:     { background: 'transparent', color: 'var(--color-muted)', border: 'none' },
};

const btnSizes: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: 12 },
  md: { padding: '9px 20px', fontSize: 14 },
  lg: { padding: '12px 28px', fontSize: 15 },
};

export function Button({ variant = 'primary', size = 'md', loading, children, disabled, style, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        borderRadius: 8, fontWeight: 600, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.6 : 1, transition: 'all 0.15s', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        ...btnStyles[variant], ...btnSizes[size], ...style,
      }}
      {...props}
    >
      {loading && <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span>}
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ error, style, ...props }, ref) {
  return (
    <div>
      <input
        ref={ref}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
          border: `1.5px solid ${error ? '#ef4444' : 'var(--color-border)'}`,
          background: 'var(--color-bg)', color: 'var(--color-text)',
          outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
          transition: 'border-color 0.15s', ...style,
        }}
        {...props}
      />
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  );
});

// ─── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ style, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
        border: '1.5px solid var(--color-border)', background: 'var(--color-bg)',
        color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box',
        resize: 'vertical', fontFamily: 'inherit', ...style,
      }}
      {...props}
    />
  );
});

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ style, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
        border: '1.5px solid var(--color-border)', background: 'var(--color-bg)',
        color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box',
        cursor: 'pointer', fontFamily: 'inherit', ...style,
      }}
      {...props}
    >
      {children}
    </select>
  );
});

// ─── FormField ────────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700,
        color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{error}</p>}
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
}

export function Modal({ open, onClose, title, children, width = 600 }: ModalProps) {
  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--color-bg)', borderRadius: 16, width: '100%', maxWidth: width,
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{title}</h2>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-muted)', fontSize: 20, padding: '2px 8px', borderRadius: 6 }}>
            ✕
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  DRAFT:     { color: '#374151', bg: '#f3f4f6' },
  SENT:      { color: '#1d4ed8', bg: '#dbeafe' },
  PAID:      { color: '#15803d', bg: '#dcfce7' },
  OVERDUE:   { color: '#b91c1c', bg: '#fee2e2' },
  CANCELLED: { color: '#6b7280', bg: '#f9fafb' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      color: s.color, background: s.bg, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#0369a1', '#7c3aed', '#0f766e', '#b45309', '#be123c', '#1d4ed8', '#065f46'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.35, userSelect: 'none' }}>
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

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  const styles = {
    success: { bg: '#dcfce7', color: '#15803d', icon: '✅' },
    error:   { bg: '#fee2e2', color: '#b91c1c', icon: '❌' },
    info:    { bg: '#dbeafe', color: '#1d4ed8', icon: 'ℹ️' },
  };
  const s = styles[type];

  React.useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', top: 76, right: 20, background: s.bg, color: s.color,
      padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
      zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', gap: 10, maxWidth: 380,
      animation: 'slideIn 0.2s ease',
    }}>
      <span>{s.icon}</span>
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
        color: s.color, fontSize: 16, marginLeft: 8, padding: 0, lineHeight: 1 }}>✕</button>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>{title}</div>
      {description && <div style={{ fontSize: 14, color: 'var(--color-muted)', maxWidth: 320, marginBottom: 24 }}>{description}</div>}
      {action}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: size, height: size, borderRadius: '50%',
        border: `3px solid var(--color-border)`, borderTopColor: '#2563eb',
        animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onChange }: {
  page: number; totalPages: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        style={{ padding: '6px 14px', borderRadius: 7, border: '1.5px solid var(--color-border)',
          background: 'transparent', color: 'var(--color-muted)', cursor: page === 1 ? 'not-allowed' : 'pointer',
          opacity: page === 1 ? 0.4 : 1, fontFamily: 'inherit' }}>← Prev</button>
      <span style={{ fontSize: 13, color: 'var(--color-muted)', padding: '0 8px' }}>
        Page {page} of {totalPages}
      </span>
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        style={{ padding: '6px 14px', borderRadius: 7, border: '1.5px solid var(--color-border)',
          background: 'transparent', color: 'var(--color-muted)', cursor: page === totalPages ? 'not-allowed' : 'pointer',
          opacity: page === totalPages ? 0.4 : 1, fontFamily: 'inherit' }}>Next →</button>
    </div>
  );
}
