import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Spinner, StatusBadge, EmptyState, Button, Card, CardHeader, StatCard, Icon } from '../components/ui';

const fmt = (n: number) =>
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    <div style={{ padding: isMobile ? 16 : 26 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 750, color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
          Welcome back{user ? `, ${user.fullName.split(' ')[0]}` : ''} 👋
        </h2>
        <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 13.5 }}>
          Here's what's happening with your business this month.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(216px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard icon="money" label="Revenue (this month)" value={fmt(data.monthlyRevenue)} tone="success" />
        <StatCard icon="inbox" label="Outstanding" value={fmt(outstanding)} tone="primary" />
        <StatCard icon="file" label="Total Invoices" value={String(totalInvoices)} tone="warning" />
        <StatCard icon="building" label="Clients" value={String(data.totalClients)} tone="violet" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        {/* Recent invoices */}
        <Card>
          <CardHeader
            title="Recent Invoices"
            action={
              <Link to="/invoices" className="df-link" style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                View all <Icon name="arrow-right" size={14} />
              </Link>
            }
          />
          {data.recentInvoices?.length ? (
            <table className="df-table">
              <tbody>
                {data.recentInvoices.map((inv: any) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 20px', width: '100%' }}>
                      <Link to={`/invoices/${inv.id}`} className="df-link" style={{ fontWeight: 650, fontSize: 13.5 }}>
                        {inv.invoiceNumber}
                      </Link>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{inv.client?.companyName}</div>
                    </td>
                    <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}><StatusBadge status={inv.status} /></td>
                    <td className="df-num" style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                      {fmt(inv.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="file" title="No invoices yet" description="Create your first invoice to get started."
              action={<Link to="/invoices/new"><Button icon="plus">New Invoice</Button></Link>} />
          )}
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardHeader title="By Status" />
          <div style={{ padding: '6px 20px 14px' }}>
            {counts.length ? counts.map((c, i) => (
              <div key={c.status} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 0', borderBottom: i === counts.length - 1 ? 'none' : '1px solid var(--color-border)',
              }}>
                <StatusBadge status={c.status} />
                <div style={{ textAlign: 'right' }}>
                  <div className="df-num" style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)' }}>
                    {fmt(c._sum.totalAmount || 0)}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-faint)' }}>
                    {c._count.status} invoice{c._count.status !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '22px 0', color: 'var(--color-muted)', fontSize: 13, textAlign: 'center' }}>
                No invoices yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
