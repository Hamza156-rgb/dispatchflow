import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInvoices } from '../hooks/useApi';
import { Button, Input, Select, Spinner, EmptyState, StatusBadge, Pagination } from '../components/ui';

const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const STATUSES = ['', 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useInvoices({
    page, limit: 15,
    status: status || undefined,
    search: search || undefined,
  });

  return (
    <div style={{ padding: 28 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, flex: 1, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 280, flex: 1, minWidth: 200 }}>
            <Input placeholder="Search invoices…" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div style={{ width: 180 }}>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              {STATUSES.map((s) => <option key={s} value={s}>{s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All statuses'}</option>)}
            </Select>
          </div>
        </div>
        <Link to="/invoices/new"><Button>+ New Invoice</Button></Link>
      </div>

      {isLoading ? <Spinner /> : !data?.invoices.length ? (
        <EmptyState icon="📄" title="No invoices found"
          description={status || search ? 'Try adjusting your filters.' : 'Create your first invoice to get started.'}
          action={<Link to="/invoices/new"><Button>+ New Invoice</Button></Link>} />
      ) : (
        <>
          <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface)' }}>
                  {['Invoice', 'Client', 'Issue Date', 'Due Date', 'Status', 'Amount'].map((h) => (
                    <th key={h} style={{ padding: '12px 18px', textAlign: h === 'Amount' ? 'right' : 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    <td style={{ padding: '13px 18px', fontWeight: 700, fontSize: 14, color: '#2563eb' }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--color-text)' }}>{inv.client?.companyName}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--color-muted)' }}>{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--color-muted)' }}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td style={{ padding: '13px 18px' }}><StatusBadge status={inv.status} /></td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: 'var(--color-text)' }}>{fmt(inv.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
