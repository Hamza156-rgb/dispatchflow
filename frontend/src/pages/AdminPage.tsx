import { useState } from 'react';
import { useOrganizations, useUpdateOrganization } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Spinner, Toast, Avatar } from '../components/ui';

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

  const totalUsers = orgs.reduce((s: number, o: any) => s + o.userCount, 0);
  const activeCount = orgs.filter((o: any) => o.accountStatus === 'ACTIVE').length;
  const pendingCount = orgs.filter((o: any) => o.accountStatus === 'PENDING').length;
  const totalMrr = orgs.reduce((s: number, o: any) => s + (o.mrr || 0), 0);
  const fmtMoney = (n: any) => `$${Number(n || 0).toLocaleString('en-US')}`;
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const th: React.CSSProperties = { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap' };

  return (
    <div style={{ padding: isMobile ? 16 : 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>🛡️ Super Admin</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 14 }}>Manage every organization — plans, activation, and suspension.</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16, marginBottom: 22 }}>
        {[['🏢', 'Organizations', orgs.length], ['✅', 'Active', activeCount], ['⏳', 'Pending', pendingCount], ['💵', 'Your MRR', fmtMoney(totalMrr)], ['👥', 'Total Users', totalUsers]].map(([i, l, v]) => (
          <div key={l as string} style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', padding: '18px 20px' }}>
            <div style={{ fontSize: 18 }}>{i}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6 }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: l === 'Your MRR' ? '#16a34a' : 'var(--color-text)', marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
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
                  <th style={th}>Joined</th>
                  <th style={{ ...th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o: any) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: busyId === o.id ? 0.5 : 1 }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={o.companyName || o.email} size={32} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{o.companyName || '—'} {o.isSuperAdmin && <span style={{ fontSize: 11, color: '#7c3aed' }}>★ admin</span>}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{o.fullName} · {o.email}</div>
                          {o.phoneNumber && <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{o.phoneNumber}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, color: 'var(--color-muted)' }}>{o.userCount} / {o.limit}</td>
                    <td style={{ ...td, color: 'var(--color-muted)' }}>{o.clients}c · {o.invoices}i · {o.loads}L</td>
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
                    <td style={{ ...td, color: 'var(--color-muted)' }}>{fmtDate(o.createdAt)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {o.accountStatus !== 'ACTIVE' && (
                        <button onClick={() => patch(o.id, { accountStatus: 'ACTIVE' }, 'Activated')} disabled={busyId === o.id}
                          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, marginRight: 6, fontFamily: 'inherit' }}>Activate</button>
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
