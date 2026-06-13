import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInvoices, useDashboard, useUpdateInvoice, useDeleteInvoice, useDownloadPdf } from '../hooks/useApi';
import { Button, Input, Select, Spinner, EmptyState, StatusBadge, Pagination, Toast, Avatar } from '../components/ui';

const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const STATUSES = ['', 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];
const ALL_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

function StatCard({ icon, label, value, accent, bg }: { icon: string; label: string; value: string; accent: string; bg: string }) {
  return (
    <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)',
      padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: accent, marginTop: 3, whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const navigate = useNavigate();
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
  const th: React.CSSProperties = { padding: '13px 20px', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'left' };
  const iconBtn: React.CSSProperties = { background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 8, padding: '6px 9px', cursor: 'pointer', fontSize: 14, lineHeight: 1 };

  return (
    <div style={{ padding: 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>Invoices</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 14 }}>Create, track, and get paid on your invoices.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 22 }}>
        <StatCard icon="📄" label="Total Invoices" value={String(totalCount)} accent="var(--color-text)" bg="#e0e7ff" />
        <StatCard icon="📨" label="Outstanding" value={fmt(sumFor(['SENT', 'OVERDUE']))} accent="#2563eb" bg="#dbeafe" />
        <StatCard icon="💰" label="Paid" value={fmt(sumFor(['PAID']))} accent="#16a34a" bg="#dcfce7" />
        <StatCard icon="📝" label="Draft" value={fmt(sumFor(['DRAFT']))} accent="#64748b" bg="#f1f5f9" />
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
        {/* Toolbar inside card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 260, flex: 1, minWidth: 180 }}>
              <Input placeholder="🔍  Search invoices…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div style={{ width: 170 }}>
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface)' }}>
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
                  <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', opacity: busyId === inv.id ? 0.5 : 1, transition: 'opacity 0.15s, background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '14px 20px', fontWeight: 700, fontSize: 14, color: '#2563eb', whiteSpace: 'nowrap' }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={inv.client?.companyName || '?'} size={30} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{inv.client?.companyName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 20px' }}><StatusBadge status={inv.status} /></td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{fmt(inv.totalAmount)}</td>
                    <td style={{ padding: '10px 20px' }} onClick={stop}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <select
                          value={inv.status}
                          disabled={busyId === inv.id}
                          onChange={(e) => changeStatus(inv.id, e.target.value, inv)}
                          title="Change status"
                          style={{ padding: '6px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            border: '1.5px solid var(--color-border)', background: 'var(--color-bg)',
                            color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                        </select>
                        <button title="Download PDF" disabled={busyId === inv.id}
                          onClick={() => downloadPdf.mutate({ id: inv.id, invoiceNumber: inv.invoiceNumber })} style={iconBtn}>⬇️</button>
                        <button title="Delete" disabled={busyId === inv.id}
                          onClick={() => handleDelete(inv.id, inv.invoiceNumber)} style={iconBtn}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: '1px solid var(--color-border)' }}>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
