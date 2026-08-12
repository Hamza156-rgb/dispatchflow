import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useInsights } from '../hooks/useApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Spinner, EmptyState, PageHeader, Icon, type IconName } from '../components/ui';

const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
const card: React.CSSProperties = {
  background: 'var(--color-bg)', borderRadius: 16, border: '1px solid var(--color-border)',
  padding: '20px 22px', boxShadow: 'var(--shadow-sm)',
};
const sectionTitle: React.CSSProperties = {
  margin: '0 0 16px', fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)',
  display: 'flex', alignItems: 'center', gap: 8,
};
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--color-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

/** Section heading with a leading icon, matching the rest of the app. */
function SectionTitle({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <h3 style={sectionTitle}>
      <span style={{ color: 'var(--color-primary)', lineHeight: 0 }}><Icon name={icon} size={17} /></span>
      {children}
    </h3>
  );
}

const RISK: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: 'var(--color-danger)', bg: 'var(--color-danger-soft)', label: 'High risk' },
  medium: { color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', label: 'Medium' },
  low: { color: 'var(--color-success)', bg: 'var(--color-success-soft)', label: 'Low risk' },
};

export default function InsightsPage() {
  const { data, isLoading } = useInsights();
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isLoading) return <Spinner />;
  if (!data) return <div style={{ padding: 28, color: 'var(--color-muted)' }}>No data.</div>;

  const { summary, reminders, latePayers, forecast, duplicates } = data;
  const pct = summary.pctChange;

  return (
    <div style={{ padding: isMobile ? 16 : 26 }}>
      <PageHeader
        icon="sparkles"
        title="Smart Insights"
        subtitle="Automatic analysis of your business — forecasts, risks, and reminders."
      />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div style={card}>
          <div style={label}>This Month</div>
          <div className="df-num" style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text)', marginTop: 4 }}>{fmt(summary.thisMonthRevenue)}</div>
          {pct !== null && (
            <div style={{ fontSize: 12, fontWeight: 650, marginTop: 4, color: pct >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}% vs last month
            </div>
          )}
        </div>
        <div style={card}>
          <div style={label}>Outstanding</div>
          <div className="df-num" style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-primary)', marginTop: 4 }}>{fmt(summary.outstandingAmount)}</div>
          <div style={{ fontSize: 12, color: 'var(--color-faint)', marginTop: 4 }}>awaiting payment</div>
        </div>
        <div style={card}>
          <div style={label}>Overdue</div>
          <div className="df-num" style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.03em', color: summary.overdueAmount > 0 ? 'var(--color-danger)' : 'var(--color-text)', marginTop: 4 }}>{fmt(summary.overdueAmount)}</div>
          <div style={{ fontSize: 12, color: 'var(--color-faint)', marginTop: 4 }}>{summary.overdueCount} invoice{summary.overdueCount !== 1 ? 's' : ''}</div>
        </div>
        <div style={card}>
          <div style={label}>Top Client</div>
          <div style={{ fontSize: 17, fontWeight: 750, letterSpacing: '-0.02em', color: 'var(--color-text)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary.topClient?.name || '—'}</div>
          {summary.topClient && <div style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 650, marginTop: 4 }}>{fmt(summary.topClient.revenue)} lifetime</div>}
        </div>
      </div>

      {/* Forecast */}
      <div style={{ ...card, marginBottom: 18 }}>
        <SectionTitle icon="chart">Cash-Flow Forecast (next 3 months)</SectionTitle>
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
          <SectionTitle icon="clock">Payment Reminders</SectionTitle>
          {reminders.length ? (
            <div>
              {reminders.slice(0, 8).map((r: any) => (
                <Link key={r.id} to={`/invoices/${r.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-primary)' }}>{r.invoiceNumber}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{r.client}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text)' }}>{fmt(r.amount)}</div>
                      <div style={{ fontSize: 11, fontWeight: 650, color: r.kind === 'overdue' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
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
          <SectionTitle icon="alert">Client Payment Risk</SectionTitle>
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
        <div style={{ ...card, borderColor: 'var(--color-danger-line)' }}>
          <SectionTitle icon="search">Possible Duplicate Invoices</SectionTitle>
          <p style={{ margin: '-8px 0 12px', fontSize: 12, color: 'var(--color-muted)' }}>Same client &amp; amount within 7 days — worth a quick check.</p>
          {duplicates.map((d: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
              <span style={{ color: 'var(--color-text)' }}>
                <strong>{d.client}</strong> — <Link to={`/invoices/${d.aId}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{d.a}</Link> &amp; <Link to={`/invoices/${d.bId}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{d.b}</Link>
              </span>
              <span style={{ fontWeight: 800, color: 'var(--color-danger)' }}>{fmt(d.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {reminders.length === 0 && latePayers.length === 0 && duplicates.length === 0 && summary.thisMonthRevenue === 0 && (
        <EmptyState icon="sparkles" title="Insights will appear as you add data"
          description="Create clients and invoices, record some payments, and this page fills with forecasts, reminders, and risk analysis." />
      )}
    </div>
  );
}
