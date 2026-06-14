import { useState } from 'react';
import { useLoads, useClients, useCreateLoad, useUpdateLoad, useDeleteLoad } from '../hooks/useApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Button, Input, Select, Textarea, FormField, Modal, Spinner, EmptyState, Pagination, Toast, Avatar } from '../components/ui';
import type { Load, LoadPayload } from '../types';

const fmt = (n: any) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
const EQUIPMENT = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Power Only', 'Box Truck', 'Hotshot', 'Other'];
const STATUS_FILTERS = ['', 'PENDING', 'ACTIVE', 'DELIVERED', 'CANCELLED'];
const ALL_STATUSES = ['PENDING', 'ACTIVE', 'DELIVERED', 'CANCELLED'];

const STATUS_STYLE: Record<string, { c: string; bg: string; label: string }> = {
  PENDING:   { c: '#b45309', bg: '#fef3c7', label: 'Pending' },
  ACTIVE:    { c: '#1d4ed8', bg: '#dbeafe', label: 'Active' },
  DELIVERED: { c: '#15803d', bg: '#dcfce7', label: 'Delivered' },
  CANCELLED: { c: '#6b7280', bg: '#f3f4f6', label: 'Cancelled' },
};

const toLocalInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
const fmtDateTime = (iso?: string) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

const EMPTY: LoadPayload = {
  clientId: '', originCity: '', originState: '', destCity: '', destState: '',
  pickupAt: '', deliveryAt: '', miles: '', rate: '', equipment: 'Dry Van',
  driver: '', referenceNumber: '', status: 'PENDING', paymentStatus: 'UNPAID', notes: '',
};

function StatCard({ icon, label, value, accent, bg }: { icon: string; label: string; value: string; accent: string; bg: string }) {
  return (
    <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: accent, marginTop: 3, whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  );
}

export default function LoadsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Load | null>(null);
  const [form, setForm] = useState<LoadPayload>(EMPTY);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useLoads({ page, limit: 20, status: status || undefined, search: search || undefined });
  const { data: clientsData } = useClients({ limit: 200 });
  const createLoad = useCreateLoad();
  const updateLoad = useUpdateLoad();
  const deleteLoad = useDeleteLoad();

  const summary = data?.summary ?? { totalLoads: 0, active: 0, delivered: 0, unpaidAmount: 0, totalRevenue: 0 };
  const set = (k: keyof LoadPayload, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (l: Load) => {
    setEditing(l);
    setForm({
      clientId: l.clientId, originCity: l.originCity || '', originState: l.originState || '',
      destCity: l.destCity || '', destState: l.destState || '',
      pickupAt: toLocalInput(l.pickupAt), deliveryAt: toLocalInput(l.deliveryAt),
      miles: l.miles != null ? String(l.miles) : '', rate: String(l.rate),
      equipment: l.equipment || 'Dry Van', driver: l.driver || '', referenceNumber: l.referenceNumber || '',
      status: l.status, paymentStatus: l.paymentStatus, notes: l.notes || '',
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.clientId) { setToast({ msg: 'Please select a client', type: 'error' }); return; }
    if (!form.rate) { setToast({ msg: 'Please enter a rate', type: 'error' }); return; }
    try {
      if (editing) await updateLoad.mutateAsync({ id: editing.id, data: form });
      else await createLoad.mutateAsync(form);
      setModal(false);
      setToast({ msg: editing ? 'Load updated' : 'Load created', type: 'success' });
    } catch {
      setToast({ msg: 'Could not save load', type: 'error' });
    }
  };

  const quickUpdate = async (id: string, patch: any) => {
    setBusyId(id);
    try { await updateLoad.mutateAsync({ id, data: patch }); }
    catch { setToast({ msg: 'Update failed', type: 'error' }); }
    finally { setBusyId(null); }
  };

  const remove = async (l: Load) => {
    if (!confirm(`Delete ${l.loadNumber}? This cannot be undone.`)) return;
    setBusyId(l.id);
    try { await deleteLoad.mutateAsync(l.id); setToast({ msg: `${l.loadNumber} deleted`, type: 'success' }); }
    catch { setToast({ msg: 'Delete failed', type: 'error' }); }
    finally { setBusyId(null); }
  };

  const th: React.CSSProperties = { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'left' };
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap' };
  const route = (l: Load) => `${[l.originCity, l.originState].filter(Boolean).join(', ') || '—'} → ${[l.destCity, l.destState].filter(Boolean).join(', ') || '—'}`;
  const perMile = (l: Load) => { const m = Number(l.miles || 0); return m > 0 ? `$${(Number(l.rate) / m).toFixed(2)}` : '—'; };

  return (
    <div style={{ padding: isMobile ? 16 : 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>🚚 Loads</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 14 }}>Track every shipment from booked to delivered to paid.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 22 }}>
        <StatCard icon="📦" label="Total Loads" value={String(summary.totalLoads)} accent="var(--color-text)" bg="#e0e7ff" />
        <StatCard icon="🚛" label="In Transit" value={String(summary.active)} accent="#2563eb" bg="#dbeafe" />
        <StatCard icon="✅" label="Delivered" value={String(summary.delivered)} accent="#16a34a" bg="#dcfce7" />
        <StatCard icon="💸" label="Unpaid to You" value={fmt(summary.unpaidAmount)} accent="#ef4444" bg="#fee2e2" />
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 240, flex: 1, minWidth: 170 }}>
              <Input placeholder="🔍  Search loads…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div style={{ width: 160 }}>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s ? STATUS_STYLE[s].label : 'All statuses'}</option>)}
              </Select>
            </div>
          </div>
          <Button onClick={openNew}>+ New Load</Button>
        </div>

        {isLoading ? <Spinner /> : !data?.loads.length ? (
          <EmptyState icon="🚚" title="No loads yet"
            description={status || search ? 'Try adjusting your filters.' : 'Add your first shipment to start tracking.'}
            action={<Button onClick={openNew}>+ New Load</Button>} />
        ) : (
          <>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)' }}>
                    <th style={th}>Load</th>
                    <th style={th}>Client</th>
                    <th style={th}>Route</th>
                    <th style={th}>Pickup</th>
                    <th style={th}>Delivery</th>
                    <th style={{ ...th, textAlign: 'right' }}>Miles</th>
                    <th style={{ ...th, textAlign: 'right' }}>Rate</th>
                    <th style={{ ...th, textAlign: 'right' }}>$/mi</th>
                    <th style={th}>Status</th>
                    <th style={th}>Paid</th>
                    <th style={{ ...th, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.loads.map((l: Load) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: busyId === l.id ? 0.5 : 1 }}>
                      <td style={{ ...td, fontWeight: 700, color: '#2563eb', cursor: 'pointer' }} onClick={() => openEdit(l)}>{l.loadNumber}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={l.client?.companyName || '?'} size={26} />
                          <span style={{ fontSize: 13 }}>{l.client?.companyName}</span>
                        </div>
                      </td>
                      <td style={{ ...td, color: 'var(--color-muted)' }}>{route(l)}</td>
                      <td style={{ ...td, color: 'var(--color-muted)' }}>{fmtDateTime(l.pickupAt)}</td>
                      <td style={{ ...td, color: 'var(--color-muted)' }}>{fmtDateTime(l.deliveryAt)}</td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--color-muted)' }}>{l.miles ? Number(l.miles) : '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 800 }}>{fmt(l.rate)}</td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--color-muted)' }}>{perMile(l)}</td>
                      {/* Status inline */}
                      <td style={{ padding: '10px 16px' }}>
                        <select value={l.status} disabled={busyId === l.id} onChange={(e) => quickUpdate(l.id, { status: e.target.value })}
                          style={{ padding: '5px 8px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none',
                            border: 'none', color: STATUS_STYLE[l.status].c, background: STATUS_STYLE[l.status].bg, fontFamily: 'inherit' }}>
                          {ALL_STATUSES.map((s) => <option key={s} value={s} style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>{STATUS_STYLE[s].label}</option>)}
                        </select>
                      </td>
                      {/* Payment toggle */}
                      <td style={{ padding: '10px 16px' }}>
                        <button disabled={busyId === l.id}
                          onClick={() => quickUpdate(l.id, { paymentStatus: l.paymentStatus === 'PAID' ? 'UNPAID' : 'PAID' })}
                          title="Toggle paid / unpaid"
                          style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                            color: l.paymentStatus === 'PAID' ? '#15803d' : '#b91c1c', background: l.paymentStatus === 'PAID' ? '#dcfce7' : '#fee2e2' }}>
                          {l.paymentStatus === 'PAID' ? '✓ Paid' : 'Unpaid'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button title="Edit" onClick={() => openEdit(l)} disabled={busyId === l.id}
                          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', fontSize: 14, marginRight: 6 }}>✏️</button>
                        <button title="Delete" onClick={() => remove(l)} disabled={busyId === l.id}
                          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
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
      </div>

      {/* Add / Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.loadNumber}` : 'New Load'} width={680}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          <FormField label="Client" required>
            <Select value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
              <option value="">Select client…</option>
              {clientsData?.clients.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </Select>
          </FormField>
          <FormField label="Equipment">
            <Select value={form.equipment} onChange={(e) => set('equipment', e.target.value)}>
              {EQUIPMENT.map((e) => <option key={e} value={e}>{e}</option>)}
            </Select>
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 2fr 1fr', gap: 12 }}>
          <FormField label="Origin City"><Input value={form.originCity} onChange={(e) => set('originCity', e.target.value)} placeholder="Chicago" /></FormField>
          <FormField label="State"><Input value={form.originState} onChange={(e) => set('originState', e.target.value)} placeholder="IL" /></FormField>
          <FormField label="Dest City"><Input value={form.destCity} onChange={(e) => set('destCity', e.target.value)} placeholder="Gary" /></FormField>
          <FormField label="State"><Input value={form.destState} onChange={(e) => set('destState', e.target.value)} placeholder="IN" /></FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          <FormField label="Pickup Date & Time"><Input type="datetime-local" value={form.pickupAt} onChange={(e) => set('pickupAt', e.target.value)} /></FormField>
          <FormField label="Delivery Date & Time"><Input type="datetime-local" value={form.deliveryAt} onChange={(e) => set('deliveryAt', e.target.value)} /></FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12 }}>
          <FormField label="Miles"><Input type="number" step="1" value={form.miles} onChange={(e) => set('miles', e.target.value)} placeholder="450" /></FormField>
          <FormField label="Rate ($)" required><Input type="number" step="0.01" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="850" /></FormField>
          <FormField label="$ / Mile">
            <Input value={Number(form.miles) > 0 && form.rate ? `$${(Number(form.rate) / Number(form.miles)).toFixed(2)}` : '—'} disabled />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          <FormField label="Driver / Carrier"><Input value={form.driver} onChange={(e) => set('driver', e.target.value)} placeholder="Optional" /></FormField>
          <FormField label="Reference #"><Input value={form.referenceNumber} onChange={(e) => set('referenceNumber', e.target.value)} placeholder="Broker / load ref" /></FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
            </Select>
          </FormField>
          <FormField label="Payment">
            <Select value={form.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)}>
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Commodity, weight, special instructions…" /></FormField>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save} loading={createLoad.isPending || updateLoad.isPending}>{editing ? 'Save Changes' : 'Create Load'}</Button>
        </div>
      </Modal>
    </div>
  );
}
