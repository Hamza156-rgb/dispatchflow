import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInvoice, useUpdateInvoice, useDeleteInvoice, useRecordPayment, useSendInvoiceEmail, useDownloadPdf } from '../hooks/useApi';
import { Button, StatusBadge, Modal, FormField, Input, Select, Toast, Spinner } from '../components/ui';

const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id!);
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const recordPayment = useRecordPayment();
  const sendEmail = useSendInvoiceEmail();
  const downloadPdf = useDownloadPdf();

  const [payModal, setPayModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0,10), paymentMethod: 'BANK_TRANSFER', referenceNumber: '', notes: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  if (isLoading) return <Spinner />;
  if (!invoice) return <div style={{ padding: 28, color: 'var(--color-muted)' }}>Invoice not found.</div>;

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  const paid = (invoice.payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const balance = Number(invoice.totalAmount) - paid;

  const handleMarkSent = async () => {
    await updateInvoice.mutateAsync({ id: id!, data: { status: 'SENT', sentAt: new Date().toISOString() } });
    showToast('Invoice marked as sent');
  };

  const handleStatusChange = async (status: string) => {
    const data: any = { status };
    if (status === 'SENT' && !invoice.sentAt) data.sentAt = new Date().toISOString();
    if (status === 'PAID' && !invoice.paidAt) data.paidAt = new Date().toISOString();
    try {
      await updateInvoice.mutateAsync({ id: id!, data });
      showToast(`Status changed to ${status.charAt(0) + status.slice(1).toLowerCase()}`);
    } catch {
      showToast('Could not update status', 'error');
    }
  };

  const handleRecordPayment = async () => {
    await recordPayment.mutateAsync({ invoiceId: id!, ...payForm, paymentMethod: payForm.paymentMethod as any, amount: parseFloat(payForm.amount) });
    setPayModal(false);
    showToast('Payment recorded');
  };

  const handleSendEmail = async () => {
    await sendEmail.mutateAsync({ id: id!, message: emailMsg });
    setEmailModal(false);
    showToast('Invoice sent via email!');
  };

  const handleDelete = async () => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    await deleteInvoice.mutateAsync(id!);
    navigate('/invoices');
  };

  const handleDownloadPdf = () => downloadPdf.mutate({ id: id!, invoiceNumber: invoice.invoiceNumber });

  const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' };

  return (
    <div style={{ padding: 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--color-muted)' }}>
        <Link to="/invoices" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Invoices</Link>
        <span>→</span>
        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{invoice.invoiceNumber}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>
        {/* ─── LEFT: invoice document ─────────────────────────────── */}
        <div>
          <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: '#0f172a', padding: '28px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>INVOICE</div>
                <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 15, marginTop: 4 }}>{invoice.invoiceNumber}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{invoice.client.companyName}</div>
                <div style={{ marginTop: 8 }}><StatusBadge status={invoice.status} /></div>
              </div>
            </div>

            <div style={{ padding: '28px 36px' }}>
              {/* Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 28 }}>
                {[
                  ['Issue Date', new Date(invoice.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
                  ['Due Date',   new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
                  ['Terms',      invoice.terms || '—'],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <div style={{ ...sectionLabel, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Bill To */}
              <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '16px 20px', marginBottom: 28 }}>
                <div style={{ ...sectionLabel, marginBottom: 8 }}>Bill To</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>{invoice.client.companyName}</div>
                {invoice.client.contactPerson && <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>{invoice.client.contactPerson}</div>}
                {invoice.client.email && <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{invoice.client.email}</div>}
              </div>

              {/* Items */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)' }}>
                    {['Description', 'Qty', 'Rate', 'Amount'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Description' ? 'left' : 'right', ...sectionLabel }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '13px 14px', fontSize: 14, color: 'var(--color-text)' }}>{item.description}</td>
                      <td style={{ padding: '13px 14px', fontSize: 13, color: 'var(--color-muted)', textAlign: 'right' }}>{Number(item.quantity)}</td>
                      <td style={{ padding: '13px 14px', fontSize: 13, color: 'var(--color-muted)', textAlign: 'right' }}>${Number(item.rate).toFixed(2)}</td>
                      <td style={{ padding: '13px 14px', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', textAlign: 'right' }}>${Number(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 280 }}>
                  {[['Subtotal', `$${Number(invoice.subtotal).toFixed(2)}`], [`Tax (${Number(invoice.taxRate)}%)`, `$${Number(invoice.taxAmount).toFixed(2)}`]].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                      <span>{l}</span><span>{v}</span>
                    </div>
                  ))}
                  {paid > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#16a34a', borderBottom: '1px solid var(--color-border)' }}>
                      <span>Paid</span><span>−${paid.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '12px 16px', background: '#0f172a', borderRadius: 8, fontSize: 16, fontWeight: 900, color: '#fff' }}>
                    <span>{paid > 0 ? 'Balance Due' : 'Total Due'}</span>
                    <span>${(paid > 0 ? balance : Number(invoice.totalAmount)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--color-surface)', borderRadius: 8 }}>
                  <div style={{ ...sectionLabel, marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>{invoice.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Payment history */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div style={{ marginTop: 20, background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14 }}>Payment History</div>
              {invoice.payments.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{p.paymentMethod.replace('_', ' ')}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                      {new Date(p.paymentDate).toLocaleDateString()} {p.referenceNumber && `· Ref: ${p.referenceNumber}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>${Number(p.amount).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── RIGHT: actions sidebar ─────────────────────────────── */}
        <aside style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Balance summary */}
          <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', padding: '20px 22px' }}>
            <div style={{ ...sectionLabel, marginBottom: 12 }}>Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: 'var(--color-muted)' }}>
              <span>Total</span><span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{fmt(invoice.totalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: 'var(--color-muted)' }}>
              <span>Paid</span><span style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(paid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 6, borderTop: '1px solid var(--color-border)', fontSize: 16 }}>
              <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>Balance Due</span>
              <span style={{ fontWeight: 900, color: balance > 0 ? '#0f172a' : '#16a34a' }}>{fmt(balance)}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ ...sectionLabel, marginBottom: 8 }}>Status</div>
              <Select value={invoice.status} disabled={updateInvoice.isPending} onChange={(e) => handleStatusChange(e.target.value)}>
                {['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].map((s) => (
                  <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                ))}
              </Select>
            </div>

            <div style={{ height: 1, background: 'var(--color-border)' }} />

            {invoice.status === 'DRAFT' && (
              <Button onClick={handleMarkSent} variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>📤 Mark as Sent</Button>
            )}
            {balance > 0 && invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED' && (
              <Button onClick={() => { setPayForm(f => ({ ...f, amount: String(balance.toFixed(2)) })); setPayModal(true); }} variant="success" style={{ width: '100%', justifyContent: 'center' }}>
                💳 Record Payment
              </Button>
            )}
            <Button onClick={() => setEmailModal(true)} variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>📧 Send Email</Button>
            <Button onClick={handleDownloadPdf} loading={downloadPdf.isPending} variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>⬇️ Download PDF</Button>
            <Button onClick={handleDelete} variant="danger" style={{ width: '100%', justifyContent: 'center' }}>🗑️ Delete</Button>
          </div>
        </aside>
      </div>

      {/* Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment" width={460}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#16a34a' }}>{fmt(balance)}</div>
          <div style={{ color: 'var(--color-muted)', fontSize: 14 }}>Balance due for {invoice.invoiceNumber}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormField label="Amount"><Input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({...f, amount: e.target.value}))} /></FormField>
          <FormField label="Payment Date"><Input type="date" value={payForm.paymentDate} onChange={e => setPayForm(f => ({...f, paymentDate: e.target.value}))} /></FormField>
        </div>
        <FormField label="Payment Method">
          <Select value={payForm.paymentMethod} onChange={e => setPayForm(f => ({...f, paymentMethod: e.target.value}))}>
            {[['BANK_TRANSFER','Bank Transfer'],['CHECK','Check'],['ACH','ACH'],['CASH','Cash'],['CREDIT_CARD','Credit Card'],['OTHER','Other']].map(([val, label]) =>
              <option key={val} value={val}>{label}</option>)}
          </Select>
        </FormField>
        <FormField label="Reference Number"><Input value={payForm.referenceNumber} onChange={e => setPayForm(f => ({...f, referenceNumber: e.target.value}))} placeholder="Optional" /></FormField>
        <Button onClick={handleRecordPayment} loading={recordPayment.isPending} style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>
          ✅ Confirm Payment
        </Button>
      </Modal>

      {/* Email Modal */}
      <Modal open={emailModal} onClose={() => setEmailModal(false)} title="Send Invoice via Email" width={460}>
        <div style={{ padding: '4px 0 16px', fontSize: 14, color: 'var(--color-muted)' }}>
          Sending to <strong>{invoice.client.email}</strong>
        </div>
        <FormField label="Custom Message (optional)">
          <textarea value={emailMsg} onChange={e => setEmailMsg(e.target.value)} rows={4}
            placeholder="Add a personal message…"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
              border: '1.5px solid var(--color-border)', background: 'var(--color-bg)',
              color: 'var(--color-text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
        </FormField>
        <Button onClick={handleSendEmail} loading={sendEmail.isPending} style={{ width: '100%', justifyContent: 'center' }}>
          📧 Send Invoice
        </Button>
      </Modal>
    </div>
  );
}
