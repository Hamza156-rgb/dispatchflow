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
    <div style={{ padding: isMobile ? 16 : 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>👥 Team</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 14 }}>People in your <strong>{user?.plan || 'STARTER'}</strong> workspace.</p>
        </div>
        {isOwner && <Button onClick={() => setModal(true)} disabled={atLimit}>+ Add member</Button>}
      </div>

      {/* Seat usage */}
      <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)', padding: '22px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seats used</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>{count} <span style={{ fontSize: 16, color: 'var(--color-muted)', fontWeight: 700 }}>/ {limit}</span></div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: atLimit ? '#b91c1c' : '#16a34a', background: atLimit ? '#fee2e2' : '#dcfce7', padding: '6px 13px', borderRadius: 20 }}>
            {atLimit ? 'Limit reached' : `${limit - count} seat${limit - count !== 1 ? 's' : ''} left`}
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 6, transition: 'width 0.3s',
            background: atLimit ? 'linear-gradient(90deg,#f87171,#ef4444)' : 'linear-gradient(90deg,#60a5fa,#2563eb)' }} />
        </div>
        {atLimit && <p style={{ margin: '12px 0 0', fontSize: 13, color: '#b45309' }}>You've reached your <strong>{user?.plan}</strong> plan limit — upgrade to add more team members.</p>}
      </div>

      {isLoading ? <Spinner /> : (
        <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>Members</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface)' }}>
                {['Member', 'Email', 'Role', ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 20px', textAlign: i === 3 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.members.map((m: any) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={m.fullName} size={38} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
                          {m.fullName}{m.id === user?.id && <span style={{ fontSize: 11, color: '#fff', background: '#2563eb', padding: '1px 7px', borderRadius: 10, marginLeft: 8, fontWeight: 700 }}>You</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Joined {new Date(m.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--color-muted)' }}>{m.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      color: m.role === 'OWNER' ? '#1d4ed8' : '#475569', background: m.role === 'OWNER' ? '#dbeafe' : 'var(--color-surface)' }}>
                      {m.role === 'OWNER' ? '👑 Owner' : 'Member'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                    {isOwner && m.role !== 'OWNER' && (
                      <button onClick={() => remove(m.id, m.fullName)} title="Remove member"
                        style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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
