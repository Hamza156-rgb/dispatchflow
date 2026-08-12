import { useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useLocation } from 'react-router-dom';
import { Spinner, Toast, Avatar, StatCard, Icon } from '../components/ui';
import { useAdminPlans, useCreatePlan, useDeletePlan, useOrganizations, useRecordOrgPayment, useUpdateOrganization, useUpdatePlan } from '../hooks/useApi';
import type { PricingPlan } from '../types';

const DAY = 86_400_000;
function billing(o: any) {
  if (o.accountStatus === 'SUSPENDED') return { label: 'Suspended', c: 'var(--color-danger)', bg: 'var(--color-danger-soft)', sub: '' };
  if (!o.currentPeriodEnd) return { label: 'Awaiting payment', c: 'var(--color-warning)', bg: 'var(--color-warning-soft)', sub: 'Never paid' };
  const end = new Date(o.currentPeriodEnd).getTime();
  const days = Math.ceil((end - Date.now()) / DAY);
  const sub = new Date(o.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (days < 0) return { label: `Overdue ${-days}d`, c: 'var(--color-danger)', bg: 'var(--color-danger-soft)', sub: `Due ${sub}` };
  if (days <= 7) return { label: `Due in ${days}d`, c: 'var(--color-warning)', bg: 'var(--color-warning-soft)', sub: `Due ${sub}` };
  return { label: 'Paid', c: 'var(--color-success)', bg: 'var(--color-success-soft)', sub: `Until ${sub}` };
}

const blankPlan: Partial<PricingPlan> = { code: '', name: '', tagline: '', description: '', price: 0, userLimit: 0, popular: false, active: true, sortOrder: 0, features: [] };

export default function AdminPage() {
  const { user } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const location = useLocation();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<PricingPlan> | null>(null);
  const [featuresText, setFeaturesText] = useState('');

  const { data: orgData, isLoading: orgLoading, error: orgError } = useOrganizations();
  const { data: planData, isLoading: planLoading, error: planError } = useAdminPlans();
  const updateOrg = useUpdateOrganization();
  const recordPay = useRecordOrgPayment();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const orgs = orgData?.organizations ?? [];
  const plans = planData?.plans ?? [];

  const summary = useMemo(() => ({
    orgs: orgs.length,
    active: orgs.filter((o: any) => o.accountStatus === 'ACTIVE').length,
    due: orgs.filter((o: any) => o.accountStatus !== 'SUSPENDED' && billing(o).label !== 'Paid').length,
    mrr: orgs.reduce((s: number, o: any) => s + (o.mrr || 0), 0),
    users: orgs.reduce((s: number, o: any) => s + (o.userCount || 0), 0),
  }), [orgs]);

  if (!user?.isSuperAdmin) {
    return <div style={{ padding: 28, color: 'var(--color-muted)' }}>You don't have access to this page.</div>;
  }

  const patchOrg = async (id: string, body: any, msg: string) => {
    setBusyId(id);
    try { await updateOrg.mutateAsync({ id, data: body }); setToast({ msg, type: 'success' }); }
    catch { setToast({ msg: 'Update failed', type: 'error' }); }
    finally { setBusyId(null); }
  };

  const savePlan = async () => {
    const payload = { ...editing, features: featuresText.split('\n').map((s) => s.trim()).filter(Boolean) };
    try {
      if (editing?.id) await updatePlan.mutateAsync({ id: editing.id, data: payload });
      else await createPlan.mutateAsync(payload);
      setToast({ msg: 'Plan saved', type: 'success' });
      setEditing(null);
      setFeaturesText('');
    } catch {
      setToast({ msg: 'Could not save plan', type: 'error' });
    }
  };

  const section = location.pathname.endsWith('/plans')
    ? 'plans'
    : location.pathname.endsWith('/organizations')
      ? 'organizations'
      : 'overview';

  const startEdit = (p: PricingPlan) => {
    setEditing(p);
    setFeaturesText((p.features || []).join('\n'));
  };

  // A failed load must say so — an empty table reads as "no data", which sent us
  // hunting in the wrong place last time.
  const ErrorNote = ({ error }: { error: unknown }) => {
    const res = (error as any)?.response;
    const detail = res?.data?.error ?? (res ? `HTTP ${res.status}` : 'Could not reach the server');
    return (
      <div style={{ background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger-line)', color: 'var(--color-danger)', borderRadius: 12, padding: '14px 16px', fontSize: 13, fontWeight: 600 }}>
        Couldn't load this data — {detail}.
      </div>
    );
  };

  const th: React.CSSProperties = { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap' };
  const chipBtn: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 999,
    border: '1px solid var(--color-border-strong)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontSize: 12,
    fontWeight: 650,
    cursor: 'pointer',
    boxShadow: 'var(--shadow-xs)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease',
  };
  const primaryChipBtn: React.CSSProperties = {
    ...chipBtn,
    background: '#16a34a',
    color: '#fff',
    border: '1px solid transparent',
  };
  const selectStyle: React.CSSProperties = {
    padding: '9px 36px 9px 13px',
    borderRadius: 10,
    border: '1px solid var(--color-border-strong)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontWeight: 600,
    fontSize: 12.5,
    outline: 'none',
    boxShadow: 'var(--shadow-xs)',
    cursor: 'pointer',
    appearance: 'none',
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{
        borderRadius: 18, padding: isMobile ? '22px 20px' : '24px 28px', marginBottom: 20,
        background: 'radial-gradient(700px 240px at 88% -30%, rgba(124,58,237,0.42), transparent), linear-gradient(180deg, #101a2e 0%, #0b1220 100%)',
        color: '#fff', border: '1px solid #1c2740', boxShadow: 'var(--shadow-md)',
        display: 'flex', alignItems: 'center', gap: 15,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: 'rgba(96,165,250,0.14)', border: '1px solid rgba(96,165,250,0.28)',
          color: '#93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="shield" size={22} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 750, letterSpacing: '-0.025em' }}>Super Admin Console</h2>
          <p style={{ margin: '4px 0 0', color: '#93a3bb', fontSize: 13.5 }}>Manage organizations, plans, and billing from one place.</p>
        </div>
      </div>

      <div style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 18 }}>
        {section === 'overview' && 'Overview'}
        {section === 'organizations' && 'Organizations'}
        {section === 'plans' && 'Plans'}
      </div>

      {section === 'overview' && (
        <>
          {orgError && <div style={{ marginBottom: 18 }}><ErrorNote error={orgError} /></div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px,1fr))', gap: 14, marginBottom: 20 }}>
            <StatCard icon="building" label="Organizations" value={String(summary.orgs)} tone="violet" />
            <StatCard icon="check-circle" label="Active" value={String(summary.active)} tone="success" />
            <StatCard icon="alert" label="Payments Due" value={String(summary.due)} tone="danger" valueColor="var(--color-danger)" />
            <StatCard icon="money" label="Your MRR" value={`$${summary.mrr.toLocaleString('en-US')}`} tone="success" valueColor="var(--color-success)" />
            <StatCard icon="users" label="Total Users" value={String(summary.users)} tone="primary" />
          </div>
          <div className="df-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Quick Notes</div>
            <div style={{ color: 'var(--color-muted)', fontSize: 14, lineHeight: 1.7 }}>
              Use <strong>Organizations</strong> for billing and account status.
              Use <strong>Plans</strong> to edit pricing, seat limits, and landing page cards.
            </div>
          </div>
        </>
      )}

      {section === 'organizations' && (
        <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>All Organizations</h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', background: 'var(--color-surface)', padding: '4px 10px', borderRadius: 20 }}>{orgs.length} total</span>
          </div>
          {orgError ? <div style={{ padding: 18 }}><ErrorNote error={orgError} /></div> : orgLoading ? <Spinner /> : <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--color-surface)' }}>{['Organization', 'Users', 'Revenue', 'MRR', 'Plan', 'Status', 'Billing', 'Actions'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {orgs.map((o: any) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={o.companyName || o.email} size={34} /><div><div style={{ fontWeight: 700 }}>{o.companyName}</div><div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{o.email}</div></div></div></td>
                    <td style={td}>{o.userCount} / {o.limit}</td>
                    <td style={{ ...td, fontWeight: 700 }}>${Number(o.revenue || 0).toLocaleString('en-US')}</td>
                    <td style={{ ...td, fontWeight: 700 }}>${Number(o.mrr || 0).toLocaleString('en-US')}</td>
                    <td style={td}>
                      <select
                        value={o.plan}
                        onChange={(e) => patchOrg(o.id, { plan: e.target.value }, 'Plan updated')}
                        style={selectStyle}
                      >
                        <option>STARTER</option>
                        <option>GROWTH</option>
                        <option>BUSINESS</option>
                      </select>
                    </td>
                    <td style={td}>{o.accountStatus}</td>
                    <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, background: billing(o).bg, color: billing(o).c, fontSize: 12, fontWeight: 700 }}>{billing(o).label}</span></td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          onClick={() => patchOrg(o.id, { accountStatus: 'SUSPENDED' }, 'Suspended')}
                          style={chipBtn}
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => recordPay.mutateAsync(o.id)}
                          style={primaryChipBtn}
                        >
                          Mark paid
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
      )}

      {section === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: 18 }}>
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>{editing?.id ? 'Edit plan' : 'New plan'}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {(['code','name','tagline','description','price','userLimit','sortOrder'] as const).map((k) => (
                <label key={k} style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--color-muted)' }}>
                  {k}
                  <input value={String((editing ?? blankPlan)[k] ?? '')} onChange={(e) => setEditing((p) => ({ ...(p ?? blankPlan), [k]: k === 'price' || k === 'userLimit' || k === 'sortOrder' ? Number(e.target.value) : e.target.value }))} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                </label>
              ))}
              <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--color-muted)' }}>
                Features, one per line
                <textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={6} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }} />
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!editing?.popular} onChange={(e) => setEditing((p) => ({ ...(p ?? blankPlan), popular: e.target.checked }))} /> Popular</label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={editing?.active !== false} onChange={(e) => setEditing((p) => ({ ...(p ?? blankPlan), active: e.target.checked }))} /> Active</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={savePlan} type="button" style={primaryChipBtn}>Save plan</button>
                <button onClick={() => { setEditing(null); setFeaturesText(''); }} type="button" style={chipBtn}>Clear</button>
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 800 }}>Plan catalog</div>
              <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>{plans.length} plans</div>
            </div>
            {planError ? <ErrorNote error={planError} /> : planLoading ? <Spinner /> : plans.length === 0 ? (
              <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>No plans yet — create one with the form.</div>
            ) : plans.map((p) => (
              <div key={p.id} style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 16, marginBottom: 12, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div><strong>{p.name}</strong> <span style={{ color: 'var(--color-muted)' }}>({p.code})</span></div>
                  <div>${p.price}/mo · up to {p.userLimit} users</div>
                </div>
                <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>{p.tagline}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{(p.features || []).map((f) => <span key={f} style={{ fontSize: 12, background: 'var(--color-surface)', borderRadius: 999, padding: '4px 10px' }}>{f}</span>)}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => startEdit(p)} type="button" style={chipBtn}>Edit</button>
                  <button onClick={() => deletePlan.mutateAsync(p.id)} type="button" style={{ ...chipBtn, color: 'var(--color-danger)' }}>{p.active ? 'Delete / deactivate' : 'Remove'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
