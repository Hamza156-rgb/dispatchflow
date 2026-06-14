import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Spinner, StatusBadge, EmptyState, Button } from '../components/ui';

const fmt = (n: number) =>
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: string; accent: string }) {
  return (
    <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)',
      padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: accent, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { user } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isLoading) return <Spinner />;
  if (!data) return <div style={{ padding: 28, color: 'var(--color-muted)' }}>No data.</div>;

  const counts: any[] = data.invoiceCounts ?? [];
  const totalInvoices = counts.reduce((s, c) => s + c._count.status, 0);
  const outstanding = counts
    .filter((c) => c.status === 'SENT' || c.status === 'OVERDUE')
    .reduce((s, c) => s + Number(c._sum.totalAmount || 0), 0);

  return (
    <div style={{ padding: isMobile ? 16 : 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>
          Welcome back{user ? `, ${user.fullName.split(' ')[0]}` : ''} 👋
        </h2>
        <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 14 }}>
          Here's what's happening with your business this month.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="💰" label="Revenue (this month)" value={fmt(data.monthlyRevenue)} accent="#dcfce7" />
        <StatCard icon="📨" label="Outstanding" value={fmt(outstanding)} accent="#dbeafe" />
        <StatCard icon="📄" label="Total Invoices" value={String(totalInvoices)} accent="#fef3c7" />
        <StatCard icon="🏢" label="Clients" value={String(data.totalClients)} accent="#f3e8ff" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Recent invoices */}
        <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 22px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Recent Invoices</h3>
            <Link to="/invoices" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>View all →</Link>
          </div>
          {data.recentInvoices?.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {data.recentInvoices.map((inv: any) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '13px 22px' }}>
                      <Link to={`/invoices/${inv.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                        {inv.invoiceNumber}
                      </Link>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{inv.client?.companyName}</div>
                    </td>
                    <td style={{ padding: '13px 14px' }}><StatusBadge status={inv.status} /></td>
                    <td style={{ padding: '13px 22px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: 'var(--color-text)' }}>
                      {fmt(inv.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="📄" title="No invoices yet" description="Create your first invoice to get started."
              action={<Link to="/invoices/new"><Button>+ New Invoice</Button></Link>} />
          )}
        </div>

        {/* Status breakdown */}
        <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>By Status</h3>
          </div>
          <div style={{ padding: '8px 22px 16px' }}>
            {counts.length ? counts.map((c) => (
              <div key={c.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                <StatusBadge status={c.status} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text)' }}>{fmt(c._sum.totalAmount || 0)}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{c._count.status} invoice{c._count.status !== 1 ? 's' : ''}</div>
                </div>
              </div>
            )) : <div style={{ padding: '20px 0', color: 'var(--color-muted)', fontSize: 13 }}>No invoices yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
