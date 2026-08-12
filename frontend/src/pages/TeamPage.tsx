import { useState } from 'react';
import { useTeam, useAddMember, useRemoveMember } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Button, Input, FormField, PasswordInput, Modal, Spinner, Toast, Avatar, Card, CardHeader, PageHeader, Icon } from '../components/ui';

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
    <div style={{ padding: isMobile ? 16 : 26 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        icon="users"
        title="Team"
        subtitle={`People in your ${user?.plan || 'STARTER'} workspace.`}
        action={isOwner ? <Button icon="plus" onClick={() => setModal(true)} disabled={atLimit}>Add member</Button> : undefined}
      />

      {/* Seat usage */}
      <Card padded={22} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Seats used</div>
            <div className="df-num" style={{ fontSize: 27, fontWeight: 800, color: 'var(--color-text)', marginTop: 3, letterSpacing: '-0.03em' }}>
              {count} <span style={{ fontSize: 15, color: 'var(--color-faint)', fontWeight: 600 }}>/ {limit}</span>
            </div>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 650, padding: '5px 12px', borderRadius: 999,
            color: atLimit ? 'var(--color-danger)' : 'var(--color-success)',
            background: atLimit ? 'var(--color-danger-soft)' : 'var(--color-success-soft)',
            border: `1px solid ${atLimit ? 'var(--color-danger-line)' : 'var(--color-success-line)'}`,
          }}>
            {atLimit ? 'Limit reached' : `${limit - count} seat${limit - count !== 1 ? 's' : ''} left`}
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'var(--color-surface)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
            background: atLimit ? 'linear-gradient(90deg,#fb7185,#e11d48)' : 'linear-gradient(90deg,#60a5fa,#2563eb)' }} />
        </div>
        {atLimit && (
          <p style={{ margin: '13px 0 0', fontSize: 13, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="alert" size={15} />
            <span>You've reached your <strong>{user?.plan}</strong> plan limit — upgrade to add more team members.</span>
          </p>
        )}
      </Card>

      {isLoading ? <Spinner /> : (
        <Card>
          <CardHeader title="Members" subtitle={`${count} of ${limit} seats in use`} />
          <div style={{ overflowX: 'auto' }}>
          <table className="df-table" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                {['Member', 'Email', 'Role', ''].map((h, i) => (
                  <th key={i} style={{ padding: '11px 20px', textAlign: i === 3 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.members.map((m: any) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={m.fullName} size={38} />
                      <div>
                        <div style={{ fontWeight: 650, fontSize: 13.5, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {m.fullName}
                          {m.id === user?.id && (
                            <span style={{ fontSize: 10.5, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', border: '1px solid var(--color-primary-line)', padding: '1px 7px', borderRadius: 999, fontWeight: 650 }}>You</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-faint)' }}>Joined {new Date(m.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--color-muted)' }}>{m.email}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 650,
                      color: m.role === 'OWNER' ? 'var(--color-warning)' : 'var(--color-muted)',
                      background: m.role === 'OWNER' ? 'var(--color-warning-soft)' : 'var(--color-neutral-soft)',
                      border: `1px solid ${m.role === 'OWNER' ? 'var(--color-warning-line)' : 'var(--color-neutral-line)'}` }}>
                      {m.role === 'OWNER' && <Icon name="crown" size={12} />}
                      {m.role === 'OWNER' ? 'Owner' : 'Member'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                    {isOwner && m.role !== 'OWNER' && (
                      <button onClick={() => remove(m.id, m.fullName)} title="Remove member" className="df-icon-btn is-danger" style={{ padding: 7 }}>
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      {!isOwner && (
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon name="info" size={15} /> Only the workspace owner can add or remove team members.
        </p>
      )}

      {/* Add member modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add team member" width={460}>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--color-muted)' }}>
          They'll sign in with this email and password and manage their own clients, loads,
          and invoices under your company brand.
        </p>
        <FormField label="Full Name" required><Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Jane Doe" /></FormField>
        <FormField label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" /></FormField>
        <FormField label="Temporary Password" required hint="Shown so you can copy it and pass it on — they can change it after signing in.">
          {/* Starts visible: the owner needs to read this back to the new member. */}
          <PasswordInput
            defaultVisible
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="At least 8 characters"
          />
        </FormField>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={add} loading={addMember.isPending}>Add member</Button>
        </div>
      </Modal>
    </div>
  );
}
