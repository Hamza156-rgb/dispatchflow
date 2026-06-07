import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useClients, useCreateClient } from '../hooks/useApi';
import { Button, Input, Modal, FormField, Spinner, EmptyState, Avatar, Pagination, Toast, Textarea } from '../components/ui';
import type { ClientPayload } from '../types';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const { data, isLoading } = useClients({ page, limit: 12, search: search || undefined });
  const createClient = useCreateClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientPayload>();

  const onCreate = async (form: ClientPayload) => {
    try {
      await createClient.mutateAsync(form);
      setModal(false);
      reset();
      setToast({ msg: 'Client added', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to add client', type: 'error' });
    }
  };

  return (
    <div style={{ padding: 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
          <Input placeholder="Search clients…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Button onClick={() => setModal(true)}>+ Add Client</Button>
      </div>

      {isLoading ? <Spinner /> : !data?.clients.length ? (
        <EmptyState icon="🏢" title="No clients found"
          description={search ? 'Try a different search.' : 'Add your first client to get started.'}
          action={<Button onClick={() => setModal(true)}>+ Add Client</Button>} />
      ) : (
        <>
          <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface)' }}>
                  {['Company', 'Contact', 'Email', 'Invoices', ''].map((h) => (
                    <th key={h} style={{ padding: '12px 18px', textAlign: h === 'Invoices' ? 'center' : 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.clients.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)}
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    <td style={{ padding: '13px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={c.companyName} size={34} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{c.companyName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--color-muted)' }}>{c.contactPerson}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--color-muted)' }}>{c.email}</td>
                    <td style={{ padding: '13px 18px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                      {c._count?.invoices ?? 0}
                    </td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', color: 'var(--color-muted)' }}>→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

      {/* Add Client modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Client" width={560}>
        <form onSubmit={handleSubmit(onCreate)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Company Name" required error={errors.companyName?.message}>
              <Input {...register('companyName', { required: 'Required' })} />
            </FormField>
            <FormField label="Contact Person" required error={errors.contactPerson?.message}>
              <Input {...register('contactPerson', { required: 'Required' })} />
            </FormField>
            <FormField label="Email" required error={errors.email?.message}>
              <Input type="email" {...register('email', { required: 'Required' })} />
            </FormField>
            <FormField label="Phone">
              <Input {...register('phone')} />
            </FormField>
          </div>
          <FormField label="Address">
            <Input {...register('address')} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            <FormField label="City"><Input {...register('city')} /></FormField>
            <FormField label="State"><Input {...register('state')} /></FormField>
            <FormField label="Zip"><Input {...register('zipCode')} /></FormField>
          </div>
          <FormField label="Notes">
            <Textarea rows={2} {...register('notes')} />
          </FormField>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={createClient.isPending}>Add Client</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
