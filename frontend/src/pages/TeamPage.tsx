import { useState } from 'react';
import { useTeam, useAddMember, useRemoveMember } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Button, Input, FormField, Modal, Spinner, Toast, Avatar } from '../components/ui';

export default function TeamPage() {
  const { user } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { data, isLoading } = useTeam();
  const addMember = useAddMember();
  const removeMember = useRemoveMember();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const isOwner = user?.role === 'OWNER';
  const count = data?.count ?? 0;
  const limit = data?.limit ?? user?.maxUsers ?? 5;
  const atLimit = count >= limit;

  const add = async () => {
    if (!form.fullName || !form.email || form.password.length < 8) {
      setToast({ msg: 'Name, email and an 8+ char password are required', type: 'error' });
      return;
    }
    try {
      await addMember.mutateAsync(form);
      setModal(false);
      setForm({ fullName: '', email: '', password: '' });
      setToast({ msg: 'Team member added', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Could not add member', type: 'error' });
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from your team? They will lose access.`)) return;
    try {
      await removeMember.mutateAsync(id);
      setToast({ msg: 'Member removed', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Could not remove member', type: 'error' });
    }
  };

  const pct = Math.min(100, Math.round((count / limit) * 100));

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 900, margin: '0 auto' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>👥 Team</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 14 }}>People in your <strong>{user?.plan || 'STARTER'}</strong> workspace.</p>
        </div>
        {isOwner && <Button onClick={() => setModal(true)} disabled={atLimit}>+ Add member</Button>}
      </div>

      {/* Usage meter */}
      <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', padding: '18px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seats used</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: atLimit ? '#ef4444' : 'var(--color-text)' }}>{count} / {limit}</span>
        </div>
        <div style={{ height: 8, borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: atLimit ? '#ef4444' : '#2563eb', transition: 'width 0.3s' }} />
        </div>
        {atLimit && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#b45309' }}>You've reached your plan limit. Upgrade your plan to add more team members.</p>}
      </div>

      {isLoading ? <Spinner /> : (
        <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface)' }}>
                {['Name', 'Email', 'Role', isOwner ? '' : ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 18px', textAlign: i === 3 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.members.map((m: any) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={m.fullName} size={30} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{m.fullName}{m.id === user?.id ? ' (you)' : ''}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--color-muted)' }}>{m.email}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      color: m.role === 'OWNER' ? '#1d4ed8' : '#475569', background: m.role === 'OWNER' ? '#dbeafe' : '#f1f5f9' }}>
                      {m.role === 'OWNER' ? 'Owner' : 'Member'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                    {isOwner && m.role !== 'OWNER' && (
                      <button onClick={() => remove(m.id, m.fullName)}
                        style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isOwner && <p style={{ marginTop: 16, fontSize: 13, color: 'var(--color-muted)' }}>Only the workspace owner can add or remove team members.</p>}

      {/* Add member modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add team member" width={460}>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--color-muted)' }}>
          They'll sign in with this email and password and manage their own clients, loads,
          and invoices under your company brand.
        </p>
        <FormField label="Full Name" required><Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Jane Doe" /></FormField>
        <FormField label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" /></FormField>
        <FormField label="Temporary Password" required><Input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="At least 8 characters" /></FormField>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={add} loading={addMember.isPending}>Add member</Button>
        </div>
      </Modal>
    </div>
  );
}
