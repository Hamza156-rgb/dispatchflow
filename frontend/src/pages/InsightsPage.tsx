import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useInsights } from '../hooks/useApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Spinner, EmptyState } from '../components/ui';

const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
const card: React.CSSProperties = { background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', padding: '20px 22px' };
const sectionTitle: React.CSSProperties = { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' };

const RISK: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: '#b91c1c', bg: '#fee2e2', label: 'High risk' },
  medium: { color: '#b45309', bg: '#fef3c7', label: 'Medium' },
  low: { color: '#15803d', bg: '#dcfce7', label: 'Low risk' },
};

export default function InsightsPage() {
  const { data, isLoading } = useInsights();
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isLoading) return <Spinner />;
  if (!data) return <div style={{ padding: 28, color: 'var(--color-muted)' }}>No data.</div>;

  const { summary, reminders, latePayers, forecast, duplicates } = data;
  const pct = summary.pctChange;

  return (
    <div style={{ padding: isMobile ? 16 : 28 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>✨ Smart Insights</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 14 }}>Automatic analysis of your business — forecasts, risks, and reminders.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 22 }}>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Month</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginTop: 4 }}>{fmt(summary.thisMonthRevenue)}</div>
          {pct !== null && (
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: pct >= 0 ? '#16a34a' : '#ef4444' }}>
              {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}% vs last month
            </div>
          )}
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#2563eb', marginTop: 4 }}>{fmt(summary.outstandingAmount)}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>awaiting payment</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overdue</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: summary.overdueAmount > 0 ? '#ef4444' : 'var(--color-text)', marginTop: 4 }}>{fmt(summary.overdueAmount)}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>{summary.overdueCount} invoice{summary.overdueCount !== 1 ? 's' : ''}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Client</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary.topClient?.name || '—'}</div>
          {summary.topClient && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, marginTop: 4 }}>{fmt(summary.topClient.revenue)} lifetime</div>}
        </div>
      </div>

      {/* Forecast */}
      <div style={{ ...card, marginBottom: 22 }}>
        <h3 style={sectionTitle}>📈 Cash-Flow Forecast (next 3 months)</h3>
        <p style={{ margin: '-8px 0 16px', fontSize: 12, color: 'var(--color-muted)' }}>
          Projected from scheduled invoices + your average monthly collections.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={forecast}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip formatter={(v: any) => fmt(v)} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
            <Bar dataKey="projected" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Projected" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 22 }}>
        {/* Reminders */}
        <div style={card}>
          <h3 style={sectionTitle}>🔔 Payment Reminders</h3>
          {reminders.length ? (
            <div>
              {reminders.slice(0, 8).map((r: any) => (
                <Link key={r.id} to={`/invoices/${r.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#2563eb' }}>{r.invoiceNumber}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{r.client}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text)' }}>{fmt(r.amount)}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: r.kind === 'overdue' ? '#ef4444' : '#b45309' }}>
                        {r.kind === 'overdue' ? `${r.daysOverdue}d overdue` : `due in ${Math.abs(r.daysOverdue)}d`}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : <div style={{ color: 'var(--color-muted)', fontSize: 13, padding: '12px 0' }}>🎉 Nothing overdue or due soon.</div>}
        </div>

        {/* Late payers */}
        <div style={card}>
          <h3 style={sectionTitle}>⚠️ Client Payment Risk</h3>
          {latePayers.length ? (
            <div>
              {latePayers.slice(0, 8).map((c: any) => {
                const r = RISK[c.risk];
                return (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                        {c.avgDaysToPay !== null ? `pays in ~${c.avgDaysToPay}d` : 'no history'}{c.outstanding > 0 ? ` · ${fmt(c.outstanding)} open` : ''}
                      </div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: r.color, background: r.bg, whiteSpace: 'nowrap' }}>{r.label}</span>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ color: 'var(--color-muted)', fontSize: 13, padding: '12px 0' }}>No client history yet.</div>}
        </div>
      </div>

      {/* Duplicates */}
      {duplicates.length > 0 && (
        <div style={{ ...card, borderColor: '#fca5a5' }}>
          <h3 style={sectionTitle}>🔎 Possible Duplicate Invoices</h3>
          <p style={{ margin: '-8px 0 12px', fontSize: 12, color: 'var(--color-muted)' }}>Same client &amp; amount within 7 days — worth a quick check.</p>
          {duplicates.map((d: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
              <span style={{ color: 'var(--color-text)' }}>
                <strong>{d.client}</strong> — <Link to={`/invoices/${d.aId}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{d.a}</Link> &amp; <Link to={`/invoices/${d.bId}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{d.b}</Link>
              </span>
              <span style={{ fontWeight: 800, color: '#ef4444' }}>{fmt(d.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {reminders.length === 0 && latePayers.length === 0 && duplicates.length === 0 && summary.thisMonthRevenue === 0 && (
        <EmptyState icon="✨" title="Insights will appear as you add data"
          description="Create clients and invoices, record some payments, and this page fills with forecasts, reminders, and risk analysis." />
      )}
    </div>
  );
}
