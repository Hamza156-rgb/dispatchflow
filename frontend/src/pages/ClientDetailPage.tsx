import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useClient, useUpdateClient, useDeleteClient } from '../hooks/useApi';
import { Button, Input, Modal, FormField, Spinner, StatusBadge, Avatar, Toast, Textarea, EmptyState } from '../components/ui';
import type { ClientPayload } from '../types';

const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id!);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [editModal, setEditModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const { register, handleSubmit, reset } = useForm<ClientPayload>();

  useEffect(() => {
    if (client) reset(client as any);
  }, [client, reset]);

  if (isLoading) return <Spinner />;
  if (!client) return <div style={{ padding: 28, color: 'var(--color-muted)' }}>Client not found.</div>;

  const onSave = async (form: ClientPayload) => {
    try {
      await updateClient.mutateAsync({ id: id!, data: form });
      setEditModal(false);
      setToast({ msg: 'Client updated', type: 'success' });
    } catch {
      setToast({ msg: 'Update failed', type: 'error' });
    }
  };

  const onDelete = async () => {
    if (!confirm('Delete this client? This cannot be undone.')) return;
    try {
      await deleteClient.mutateAsync(id!);
      navigate('/clients');
    } catch {
      setToast({ msg: 'Could not delete (client may have invoices)', type: 'error' });
    }
  };

  const invoices = client.invoices ?? [];
  const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.totalAmount), 0);

  return (
    <div style={{ padding: 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
        <Link to="/clients" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Clients</Link>
        <span style={{ color: 'var(--color-muted)' }}>→</span>
        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{client.companyName}</span>
      </div>

      {/* Header card */}
      <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)', padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar name={client.companyName} size={56} />
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>{client.companyName}</h2>
              <div style={{ color: 'var(--color-muted)', fontSize: 14, marginTop: 2 }}>{client.contactPerson} · {client.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setEditModal(true)}>✏️ Edit</Button>
            <Button variant="danger" onClick={onDelete}>🗑️ Delete</Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20, marginTop: 24 }}>
          {[
            ['Phone', client.phone || '—'],
            ['Address', [client.address, client.city, client.state, client.zipCode].filter(Boolean).join(', ') || '—'],
            ['Invoices', String(invoices.length)],
            ['Total Billed', fmt(totalBilled)],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Invoices</h3>
        </div>
        {invoices.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface)' }}>
                {['Invoice', 'Issue Date', 'Status', 'Amount'].map((h) => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: h === 'Amount' ? 'right' : 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '13px 18px' }}>
                    <Link to={`/invoices/${inv.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>{inv.invoiceNumber}</Link>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--color-muted)' }}>{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td style={{ padding: '13px 18px' }}><StatusBadge status={inv.status} /></td>
                  <td style={{ padding: '13px 18px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: 'var(--color-text)' }}>{fmt(inv.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon="📄" title="No invoices for this client"
            action={<Link to="/invoices/new"><Button>+ New Invoice</Button></Link>} />
        )}
      </div>

      {/* Edit modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Client" width={560}>
        <form onSubmit={handleSubmit(onSave)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Company Name" required><Input {...register('companyName', { required: true })} /></FormField>
            <FormField label="Contact Person" required><Input {...register('contactPerson', { required: true })} /></FormField>
            <FormField label="Email" required><Input type="email" {...register('email', { required: true })} /></FormField>
            <FormField label="Phone"><Input {...register('phone')} /></FormField>
          </div>
          <FormField label="Address"><Input {...register('address')} /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            <FormField label="City"><Input {...register('city')} /></FormField>
            <FormField label="State"><Input {...register('state')} /></FormField>
            <FormField label="Zip"><Input {...register('zipCode')} /></FormField>
          </div>
          <FormField label="Notes"><Textarea rows={2} {...register('notes')} /></FormField>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button type="submit" loading={updateClient.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
