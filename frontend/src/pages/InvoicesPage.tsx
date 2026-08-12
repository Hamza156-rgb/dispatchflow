import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInvoices, useDashboard, useUpdateInvoice, useDeleteInvoice, useDownloadPdf } from '../hooks/useApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Button, Input, Select, Spinner, EmptyState, StatusBadge, Pagination, Toast, Avatar, Card, PageHeader, StatCard, IconButton } from '../components/ui';

const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const STATUSES = ['', 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];
const ALL_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

export default function InvoicesPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useInvoices({ page, limit: 15, status: status || undefined, search: search || undefined });
  const { data: dash } = useDashboard();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const downloadPdf = useDownloadPdf();

  const counts: any[] = dash?.invoiceCounts ?? [];
  const sumFor = (s: string[]) => counts.filter(c => s.includes(c.status)).reduce((t, c) => t + Number(c._sum.totalAmount || 0), 0);
  const totalCount = counts.reduce((t, c) => t + c._count.status, 0);

  const changeStatus = async (id: string, newStatus: string, current: any) => {
    setBusyId(id);
    const payload: any = { status: newStatus };
    if (newStatus === 'SENT' && !current.sentAt) payload.sentAt = new Date().toISOString();
    if (newStatus === 'PAID' && !current.paidAt) payload.paidAt = new Date().toISOString();
    try {
      await updateInvoice.mutateAsync({ id, data: payload });
      setToast({ msg: `Status → ${newStatus.charAt(0) + newStatus.slice(1).toLowerCase()}`, type: 'success' });
    } catch {
      setToast({ msg: 'Could not update status', type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Delete ${number}? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      await deleteInvoice.mutateAsync(id);
      setToast({ msg: `${number} deleted`, type: 'success' });
    } catch {
      setToast({ msg: 'Delete failed', type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const th: React.CSSProperties = { padding: '11px 20px', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', textAlign: 'left' };

  return (
    <div style={{ padding: isMobile ? 16 : 26 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        icon="file"
        title="Invoices"
        subtitle="Create, track, and get paid on your invoices."
        action={<Link to="/invoices/new"><Button icon="plus">New Invoice</Button></Link>}
      />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(206px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard icon="file" label="Total Invoices" value={String(totalCount)} tone="violet" />
        <StatCard icon="inbox" label="Outstanding" value={fmt(sumFor(['SENT', 'OVERDUE']))} tone="primary" valueColor="var(--color-primary)" />
        <StatCard icon="money" label="Paid" value={fmt(sumFor(['PAID']))} tone="success" valueColor="var(--color-success)" />
        <StatCard icon="edit" label="Draft" value={fmt(sumFor(['DRAFT']))} tone="neutral" valueColor="var(--color-muted)" />
      </div>

      {/* Table card */}
      <Card>
        {/* Toolbar inside card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 280, flex: 1, minWidth: 180 }}>
              <Input icon="search" placeholder="Search invoices…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div style={{ width: 175 }}>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All statuses'}</option>)}
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? <Spinner /> : !data?.invoices.length ? (
          <EmptyState icon="file" title="No invoices found"
            description={status || search ? 'Try adjusting your filters.' : 'Create your first invoice to get started.'}
            action={<Link to="/invoices/new"><Button icon="plus">New Invoice</Button></Link>} />
        ) : (
          <>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="df-table" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th style={th}>Invoice</th>
                  <th style={th}>Client</th>
                  <th style={th}>Issue Date</th>
                  <th style={th}>Due Date</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv: any) => (
                  <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="df-clickable"
                    style={{ borderBottom: '1px solid var(--color-border)', opacity: busyId === inv.id ? 0.5 : 1, transition: 'opacity 0.15s, background 0.15s' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 650, fontSize: 13.5, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '10px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={inv.client?.companyName || '?'} size={30} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{inv.client?.companyName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 20px' }}><StatusBadge status={inv.status} /></td>
                    <td className="df-num" style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{fmt(inv.totalAmount)}</td>
                    <td style={{ padding: '8px 20px' }} onClick={stop}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center' }}>
                        <select
                          value={inv.status}
                          disabled={busyId === inv.id}
                          onChange={(e) => changeStatus(inv.id, e.target.value, inv)}
                          title="Change status"
                          style={{ padding: '6px 9px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            border: '1px solid var(--color-border-strong)', background: 'var(--color-bg)',
                            color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                        </select>
                        <IconButton icon="download" title="Download PDF" disabled={busyId === inv.id}
                          onClick={() => downloadPdf.mutate({ id: inv.id, invoiceNumber: inv.invoiceNumber })} />
                        <IconButton icon="trash" tone="danger" title="Delete" disabled={busyId === inv.id}
                          onClick={() => handleDelete(inv.id, inv.invoiceNumber)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)' }}>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
