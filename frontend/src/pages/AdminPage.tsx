import { useState } from 'react';
import { useOrganizations, useUpdateOrganization, useRecordOrgPayment } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Spinner, Toast, Avatar } from '../components/ui';

const DAY = 86_400_000;
// Billing status for a manual monthly subscription
function billing(o: any) {
  if (o.accountStatus === 'SUSPENDED') return { label: 'Suspended', c: '#b91c1c', bg: '#fee2e2', overdue: false, dueSoon: false, sub: '' };
  if (!o.currentPeriodEnd) return { label: 'Awaiting payment', c: '#b45309', bg: '#fef3c7', overdue: true, dueSoon: false, sub: 'Never paid' };
  const end = new Date(o.currentPeriodEnd).getTime();
  const days = Math.ceil((end - Date.now()) / DAY);
  const sub = new Date(o.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (days < 0) return { label: `Overdue ${-days}d`, c: '#b91c1c', bg: '#fee2e2', overdue: true, dueSoon: false, sub: `Due ${sub}` };
  if (days <= 7) return { label: `Due in ${days}d`, c: '#b45309', bg: '#fef3c7', overdue: false, dueSoon: true, sub: `Due ${sub}` };
  return { label: `Paid`, c: '#15803d', bg: '#dcfce7', overdue: false, dueSoon: false, sub: `Until ${sub}` };
}

const PLANS = ['STARTER', 'GROWTH', 'BUSINESS'];
const STATUS_STYLE: Record<string, { c: string; bg: string }> = {
  PENDING: { c: '#b45309', bg: '#fef3c7' },
  ACTIVE: { c: '#15803d', bg: '#dcfce7' },
  SUSPENDED: { c: '#b91c1c', bg: '#fee2e2' },
};

export default function AdminPage() {
  const { user } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { data, isLoading } = useOrganizations();
  const updateOrg = useUpdateOrganization();
  const recordPay = useRecordOrgPayment();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!user?.isSuperAdmin) {
    return <div style={{ padding: 28, color: 'var(--color-muted)' }}>You don't have access to this page.</div>;
  }

  const orgs = data?.organizations ?? [];
  const patch = async (id: string, body: any, msg: string) => {
    setBusyId(id);
    try { await updateOrg.mutateAsync({ id, data: body }); setToast({ msg, type: 'success' }); }
    catch { setToast({ msg: 'Update failed', type: 'error' }); }
    finally { setBusyId(null); }
  };
  const markPaid = async (id: string) => {
    setBusyId(id);
    try { await recordPay.mutateAsync(id); setToast({ msg: 'Payment recorded — extended 1 month', type: 'success' }); }
    catch { setToast({ msg: 'Could not record payment', type: 'error' }); }
    finally { setBusyId(null); }
  };

  const totalUsers = orgs.reduce((s: number, o: any) => s + o.userCount, 0);
  const activeCount = orgs.filter((o: any) => o.accountStatus === 'ACTIVE').length;
  const overdueCount = orgs.filter((o: any) => o.accountStatus !== 'SUSPENDED' && billing(o).overdue).length;
  const totalMrr = orgs.reduce((s: number, o: any) => s + (o.mrr || 0), 0);
  const fmtMoney = (n: any) => `$${Number(n || 0).toLocaleString('en-US')}`;
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const th: React.CSSProperties = { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap' };

  return (
    <div style={{ padding: isMobile ? 16 : 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header with gradient accent */}
      <div style={{ borderRadius: 18, padding: isMobile ? '22px 20px' : '26px 28px', marginBottom: 22,
        background: 'radial-gradient(600px 200px at 90% -20%, rgba(124,58,237,0.35), transparent), #0b1220', color: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>🛡️ Super Admin Console</h2>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 14 }}>Manage every organization — plans, activation, suspension, and revenue.</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px,1fr))', gap: 16, marginBottom: 22 }}>
        {[
          { icon: '🏢', label: 'Organizations', value: orgs.length, bg: '#e0e7ff', accent: 'var(--color-text)' },
          { icon: '✅', label: 'Active', value: activeCount, bg: '#dcfce7', accent: '#16a34a' },
          { icon: '⚠️', label: 'Payments Due', value: overdueCount, bg: '#fee2e2', accent: overdueCount > 0 ? '#b91c1c' : 'var(--color-text)' },
          { icon: '💵', label: 'Your MRR', value: fmtMoney(totalMrr), bg: '#dcfce7', accent: '#16a34a' },
          { icon: '👥', label: 'Total Users', value: totalUsers, bg: '#dbeafe', accent: 'var(--color-text)' },
        ].map((c) => (
          <div key={c.label} style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: c.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{c.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: c.accent, marginTop: 3, whiteSpace: 'nowrap' }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>All Organizations</h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', background: 'var(--color-surface)', padding: '4px 10px', borderRadius: 20 }}>{orgs.length} total</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1200, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface)' }}>
                  <th style={th}>Organization</th>
                  <th style={th}>Users</th>
                  <th style={th}>Data</th>
                  <th style={{ ...th, textAlign: 'right' }}>Revenue</th>
                  <th style={{ ...th, textAlign: 'right' }}>MRR</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Status</th>
                  <th style={th}>Billing</th>
                  <th style={th}>Joined</th>
                  <th style={{ ...th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o: any) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: busyId === o.id ? 0.5 : 1, transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={o.companyName || o.email} size={38} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{o.companyName || '—'} {o.isSuperAdmin && <span style={{ fontSize: 11, color: '#7c3aed' }}>★ admin</span>}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{o.fullName} · {o.email}</div>
                          {o.phoneNumber && <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{o.phoneNumber}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td }}>
                      <span style={{ fontWeight: 700 }}>{o.userCount}</span>
                      <span style={{ color: 'var(--color-muted)' }}> / {o.limit}</span>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[[o.clients, 'clients'], [o.invoices, 'inv'], [o.loads, 'loads']].map(([n, l]) => (
                          <span key={l as string} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', background: 'var(--color-surface)', padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{n as number} {l}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmtMoney(o.revenue)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(o.mrr)}</td>
                    <td style={td}>
                      <select value={o.plan} disabled={busyId === o.id} onChange={(e) => patch(o.id, { plan: e.target.value }, `Plan → ${e.target.value}`)}
                        style={{ padding: '6px 8px', borderRadius: 7, fontSize: 12, fontWeight: 700, border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: STATUS_STYLE[o.accountStatus]?.c, background: STATUS_STYLE[o.accountStatus]?.bg }}>
                        {o.accountStatus.charAt(0) + o.accountStatus.slice(1).toLowerCase()}
                      </span>
                    </td>
                    {/* Billing / next due */}
                    <td style={td}>
                      {(() => { const b = billing(o); return (
                        <div>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: b.c, background: b.bg, whiteSpace: 'nowrap' }}>{b.label}</span>
                          {b.sub && <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 3 }}>{b.sub}</div>}
                        </div>
                      ); })()}
                    </td>
                    <td style={{ ...td, color: 'var(--color-muted)' }}>{fmtDate(o.createdAt)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {!o.isSuperAdmin && (
                        <button onClick={() => markPaid(o.id)} disabled={busyId === o.id} title="Record a payment and extend one month"
                          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, marginRight: 6, fontFamily: 'inherit' }}>💵 Mark paid</button>
                      )}
                      {o.accountStatus !== 'SUSPENDED' && !o.isSuperAdmin && (
                        <button onClick={() => patch(o.id, { accountStatus: 'SUSPENDED' }, 'Suspended')} disabled={busyId === o.id}
                          style={{ background: 'var(--color-surface)', color: '#b91c1c', border: '1.5px solid var(--color-border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Suspend</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
