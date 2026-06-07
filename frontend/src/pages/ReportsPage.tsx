import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useReports } from '../hooks/useApi';
import { Select, Spinner } from '../components/ui';

const fmt = (n: number) => `$${Number(n).toLocaleString('en-US')}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9ca3af', SENT: '#3b82f6', PAID: '#22c55e', OVERDUE: '#ef4444', CANCELLED: '#d1d5db',
};

const card: React.CSSProperties = {
  background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', padding: '20px 24px',
};

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useReports(year);

  if (isLoading) return <Spinner />;
  if (!data) return <div style={{ padding: 28, color: 'var(--color-muted)' }}>No data.</div>;

  const monthly = (data.monthlyRevenue ?? []).map((m: any) => ({ name: MONTHS[m.month - 1], revenue: m.revenue, count: m.count }));
  const statusData = (data.statusCounts ?? []).map((s: any) => ({ name: s.status, value: s._count.status, amount: Number(s._sum.totalAmount || 0) }));
  const topClients = data.topClients ?? [];
  const totalRevenue = monthly.reduce((s: number, m: any) => s + m.revenue, 0);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>Revenue {year}</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 14 }}>Total collected: <strong style={{ color: '#16a34a' }}>{fmt(totalRevenue)}</strong></p>
        </div>
        <div style={{ width: 130 }}>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
      </div>

      {/* Monthly revenue bar chart */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Monthly Revenue</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip formatter={(v: any) => fmt(v)} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
            <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Status pie */}
        <div style={card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Invoices by Status</h3>
          {statusData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.name}>
                  {statusData.map((s: any) => <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? '#9ca3af'} />)}
                </Pie>
                <Tooltip formatter={(v: any, _n: any, p: any) => [`${v} invoices · ${fmt(p.payload.amount)}`, p.payload.name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ color: 'var(--color-muted)', fontSize: 13, padding: 20 }}>No data.</div>}
        </div>

        {/* Top clients */}
        <div style={card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Top Clients by Revenue</h3>
          {topClients.length ? topClients.map((c: any, i: number) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-surface)', color: 'var(--color-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{c.count} invoice{c.count !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#16a34a' }}>{fmt(c.revenue)}</div>
            </div>
          )) : <div style={{ color: 'var(--color-muted)', fontSize: 13, padding: 20 }}>No paid invoices yet.</div>}
        </div>
      </div>
    </div>
  );
}
