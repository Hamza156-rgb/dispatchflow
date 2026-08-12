import { useState } from 'react';
import { useLoads, useClients, useCreateLoad, useUpdateLoad, useDeleteLoad, useBulkCreateLoads, useParseLoadText } from '../hooks/useApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Button, Input, Select, Textarea, FormField, Modal, Spinner, EmptyState, Pagination, Toast, Avatar, Card, PageHeader, StatCard, Icon } from '../components/ui';
import type { Load, LoadPayload, ParsedLoadResponse } from '../types';

// Columns supported by the CSV importer (order used in the template)
const CSV_COLUMNS = ['client', 'originCity', 'originState', 'destCity', 'destState', 'pickupAt', 'deliveryAt', 'miles', 'rate', 'equipment', 'driver', 'referenceNumber', 'status', 'paymentStatus', 'notes'];

// Minimal CSV parser (handles quoted fields + commas/newlines inside quotes)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { cur.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (field !== '' || cur.length) { cur.push(field); rows.push(cur); cur = []; field = ''; }
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else field += ch;
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

const fmt = (n: any) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
const EQUIPMENT = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Power Only', 'Box Truck', 'Hotshot', 'Other'];
const STATUS_FILTERS = ['', 'PENDING', 'ACTIVE', 'DELIVERED', 'CANCELLED'];
const ALL_STATUSES = ['PENDING', 'ACTIVE', 'DELIVERED', 'CANCELLED'];

const STATUS_STYLE: Record<string, { c: string; bg: string; line: string; label: string }> = {
  PENDING:   { c: 'var(--color-warning)', bg: 'var(--color-warning-soft)', line: 'var(--color-warning-line)', label: 'Pending' },
  ACTIVE:    { c: 'var(--color-info)',    bg: 'var(--color-info-soft)',    line: 'var(--color-info-line)',    label: 'Active' },
  DELIVERED: { c: 'var(--color-success)', bg: 'var(--color-success-soft)', line: 'var(--color-success-line)', label: 'Delivered' },
  CANCELLED: { c: 'var(--color-faint)',   bg: 'var(--color-neutral-soft)', line: 'var(--color-neutral-line)', label: 'Cancelled' },
};

// Field names the parser returns → human labels, for the paste preview
const PASTE_LABELS: Record<string, string> = {
  originCity: 'Origin city', originState: 'Origin state', destCity: 'Dest city', destState: 'Dest state',
  pickupAt: 'Pickup', deliveryAt: 'Delivery', miles: 'Miles', rate: 'Rate', equipment: 'Equipment',
  weight: 'Weight', commodity: 'Commodity', driver: 'Driver', referenceNumber: 'Reference #',
  client: 'Broker / client', notes: 'Notes',
};

const toLocalInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
const fmtDateTime = (iso?: string) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

const EMPTY: LoadPayload = {
  clientId: '', originCity: '', originState: '', destCity: '', destState: '',
  pickupAt: '', deliveryAt: '', miles: '', rate: '', equipment: 'Dry Van',
  driver: '', referenceNumber: '', status: 'PENDING', paymentStatus: 'UNPAID', notes: '',
};

export default function LoadsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Load | null>(null);
  const [form, setForm] = useState<LoadPayload>(EMPTY);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErr, setImportErr] = useState('');
  const [pasteModal, setPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState<ParsedLoadResponse | null>(null);
  // Fields the parser filled in. Surfaced as a count on the review form so the
  // dispatcher knows the values came from a machine and deserve a second look.
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());

  const { data, isLoading } = useLoads({
    page, limit: 20,
    status: status || undefined,
    paymentStatus: paymentStatus || undefined,
    clientId: clientFilter || undefined,
    from: from || undefined,
    to: to || undefined,
    search: search || undefined,
  });

  const localDate = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const applyPreset = (preset: 'today' | 'week' | 'month') => {
    const now = new Date();
    if (preset === 'today') { setFrom(localDate(now)); setTo(localDate(now)); }
    else if (preset === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      const end = new Date(start); end.setDate(start.getDate() + 6);
      setFrom(localDate(start)); setTo(localDate(end));
    } else {
      setFrom(localDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      setTo(localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    }
    setPage(1);
  };
  const hasFilters = !!(status || paymentStatus || clientFilter || from || to || search);
  const clearFilters = () => { setStatus(''); setPaymentStatus(''); setClientFilter(''); setFrom(''); setTo(''); setSearch(''); setPage(1); };
  const { data: clientsData } = useClients({ limit: 200 });
  const createLoad = useCreateLoad();
  const updateLoad = useUpdateLoad();
  const deleteLoad = useDeleteLoad();
  const bulkCreate = useBulkCreateLoads();
  const parseText = useParseLoadText();

  const summary = data?.summary ?? { totalLoads: 0, active: 0, delivered: 0, unpaidAmount: 0, totalRevenue: 0 };
  const set = (k: keyof LoadPayload, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // ── CSV import ──────────────────────────────────────────────
  const downloadTemplate = () => {
    const example = ['Atlas Steel Corporation', 'Chicago', 'IL', 'Gary', 'IN', '2026-07-15 09:00', '2026-07-15 15:00', '45', '850', 'Flatbed', 'John D', 'REF-1001', 'PENDING', 'UNPAID', 'Handle with care'];
    const csv = CSV_COLUMNS.join(',') + '\n' + example.map((v) => (/[",\n]/.test(v) ? `"${v}"` : v)).join(',') + '\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'loads-template.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const onCsvFile = (file?: File) => {
    setImportErr(''); setImportRows([]);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const table = parseCSV(String(reader.result || '')).filter((r) => r.some((c) => c.trim() !== ''));
        if (table.length < 2) { setImportErr('CSV needs a header row and at least one data row.'); return; }
        const headers = table[0].map((h) => h.trim());
        const rows = table.slice(1).map((cols) => {
          const obj: any = {};
          headers.forEach((h, i) => { obj[h] = (cols[i] ?? '').trim(); });
          return obj;
        });
        setImportRows(rows);
      } catch { setImportErr('Could not parse this file. Make sure it is a valid CSV.'); }
    };
    reader.readAsText(file);
  };

  const runImport = async () => {
    try {
      const res = await bulkCreate.mutateAsync(importRows);
      setImportModal(false); setImportRows([]);
      setToast({ msg: `Imported ${res.created} load${res.created !== 1 ? 's' : ''}${res.failed ? ` · ${res.failed} skipped` : ''}`, type: res.created ? 'success' : 'error' });
    } catch {
      setToast({ msg: 'Import failed', type: 'error' });
    }
  };

  // ── Paste import ────────────────────────────────────────────
  const runParse = async () => {
    try {
      setParsed(await parseText.mutateAsync(pasteText));
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Could not read that text', type: 'error' });
    }
  };

  /** Push the parsed fields into the normal load form so it's reviewed before saving. */
  const usePasted = () => {
    if (!parsed) return;
    const f = parsed.fields;
    // Match the broker name to an existing client; unmatched leaves the picker
    // empty rather than silently creating a duplicate client.
    const client = f.client
      ? clientsData?.clients.find((c: any) => c.companyName.trim().toLowerCase() === f.client!.trim().toLowerCase())
      : undefined;

    setEditing(null);
    setForm({
      ...EMPTY,
      clientId: client?.id ?? '',
      originCity: f.originCity ?? '', originState: f.originState ?? '',
      destCity: f.destCity ?? '', destState: f.destState ?? '',
      pickupAt: toLocalInput(f.pickupAt), deliveryAt: toLocalInput(f.deliveryAt),
      miles: f.miles != null ? String(f.miles) : '',
      rate: f.rate != null ? String(f.rate) : '',
      equipment: f.equipment ?? 'Dry Van',
      referenceNumber: f.referenceNumber ?? '',
      notes: f.notes ?? '',
      source: 'PASTE',
    });
    setPrefilled(new Set([...parsed.matched, ...(client ? ['clientId'] : [])]));
    setPasteModal(false);
    setModal(true);
    if (f.client && !client) {
      setToast({ msg: `No client named "${f.client}" — pick one or add it first`, type: 'info' });
    }
  };

  const openNew = () => { setEditing(null); setForm(EMPTY); setPrefilled(new Set()); setModal(true); };
  const openEdit = (l: Load) => {
    setEditing(l);
    setPrefilled(new Set());
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

  const th: React.CSSProperties = { padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', textAlign: 'left' };
  const td: React.CSSProperties = { padding: '11px 16px', fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap' };
  const filterLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 };
  const dateStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 10, fontSize: 13, border: '1px solid var(--color-border-strong)', background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit', boxShadow: 'var(--shadow-xs)' };
  const presetBtn: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: '1px solid var(--color-border-strong)', background: 'var(--color-bg)', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-xs)' };
  const route = (l: Load) => `${[l.originCity, l.originState].filter(Boolean).join(', ') || '—'} → ${[l.destCity, l.destState].filter(Boolean).join(', ') || '—'}`;
  const perMile = (l: Load) => { const m = Number(l.miles || 0); return m > 0 ? `$${(Number(l.rate) / m).toFixed(2)}` : '—'; };

  return (
    <div style={{ padding: isMobile ? 16 : 26 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        icon="truck"
        title="Loads"
        subtitle="Track every shipment from booked to delivered to paid."
        action={<Button icon="plus" onClick={openNew}>New Load</Button>}
      />

      {/* Import helper */}
      <div style={{
        background: 'var(--color-primary-soft)',
        border: '1px solid var(--color-primary-line)',
        borderRadius: 16,
        padding: '15px 18px',
        marginBottom: 18,
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
          <span style={{ color: 'var(--color-primary)', marginTop: 1 }}><Icon name="sparkles" size={19} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)' }}>Free data import</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, marginTop: 3 }}>
              No API endpoints needed. Paste a load email or upload a CSV, review the fields, then save the load into your CRM.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="clipboard" onClick={() => { setPasteText(''); setParsed(null); setPasteModal(true); }}>Paste Load</Button>
          <Button variant="secondary" icon="upload" onClick={() => { setImportRows([]); setImportErr(''); setImportModal(true); }}>Import CSV</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard icon="package" label="Total Loads" value={String(summary.totalLoads)} tone="violet" />
        <StatCard icon="truck" label="In Transit" value={String(summary.active)} tone="primary" valueColor="var(--color-primary)" />
        <StatCard icon="check-circle" label="Delivered" value={String(summary.delivered)} tone="success" valueColor="var(--color-success)" />
        <StatCard icon="money" label="Unpaid to You" value={fmt(summary.unpaidAmount)} tone="danger" valueColor="var(--color-danger)" />
      </div>

      {/* Table card */}
      <Card>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 250, flex: 1, minWidth: 170 }}>
              <Input icon="search" placeholder="Search loads…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div style={{ width: 165 }}>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s ? STATUS_STYLE[s].label : 'All statuses'}</option>)}
              </Select>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', padding: '12px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', background: 'var(--color-surface)' }}>
          <div>
            <div style={filterLabel}>Pickup from</div>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} style={dateStyle} />
          </div>
          <div>
            <div style={filterLabel}>To</div>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} style={dateStyle} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']] as const).map(([p, label]) => (
              <button key={p} onClick={() => applyPreset(p)} style={presetBtn}>{label}</button>
            ))}
          </div>
          <div style={{ width: 140 }}>
            <div style={filterLabel}>Payment</div>
            <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
            </Select>
          </div>
          <div style={{ width: 180 }}>
            <div style={filterLabel}>Client</div>
            <Select value={clientFilter} onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}>
              <option value="">All clients</option>
              {clientsData?.clients.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </Select>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="df-chip-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 10, border: '1px solid var(--color-border-strong)', background: 'var(--color-bg)', color: 'var(--color-muted)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
              <Icon name="close" size={13} /> Clear
            </button>
          )}
        </div>

        {isLoading ? <Spinner /> : !data?.loads.length ? (
          <EmptyState icon="truck" title="No loads yet"
            description={status || search ? 'Try adjusting your filters.' : 'Add your first shipment to start tracking.'}
            action={<Button icon="plus" onClick={openNew}>New Load</Button>} />
        ) : (
          <>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="df-table" style={{ minWidth: 1020 }}>
                <thead>
                  <tr>
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
                      <td style={{ ...td, fontWeight: 650, color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => openEdit(l)}>{l.loadNumber}</td>
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
                      <td className="df-num" style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(l.rate)}</td>
                      <td className="df-num" style={{ ...td, textAlign: 'right', color: 'var(--color-muted)' }}>{perMile(l)}</td>
                      {/* Status inline */}
                      <td style={{ padding: '9px 16px' }}>
                        <select value={l.status} disabled={busyId === l.id} onChange={(e) => quickUpdate(l.id, { status: e.target.value })}
                          style={{ padding: '5px 9px', borderRadius: 999, fontSize: 12, fontWeight: 650, cursor: 'pointer', outline: 'none',
                            color: STATUS_STYLE[l.status].c, background: STATUS_STYLE[l.status].bg,
                            border: `1px solid ${STATUS_STYLE[l.status].line}`, fontFamily: 'inherit', appearance: 'none', textAlign: 'center' }}>
                          {ALL_STATUSES.map((s) => <option key={s} value={s} style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>{STATUS_STYLE[s].label}</option>)}
                        </select>
                      </td>
                      {/* Payment toggle */}
                      <td style={{ padding: '9px 16px' }}>
                        <button disabled={busyId === l.id}
                          onClick={() => quickUpdate(l.id, { paymentStatus: l.paymentStatus === 'PAID' ? 'UNPAID' : 'PAID' })}
                          title="Toggle paid / unpaid"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 650, cursor: 'pointer', fontFamily: 'inherit',
                            color: l.paymentStatus === 'PAID' ? 'var(--color-success)' : 'var(--color-danger)',
                            background: l.paymentStatus === 'PAID' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                            border: `1px solid ${l.paymentStatus === 'PAID' ? 'var(--color-success-line)' : 'var(--color-danger-line)'}` }}>
                          {l.paymentStatus === 'PAID' && <Icon name="check" size={12} />}
                          {l.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'}
                        </button>
                      </td>
                      <td style={{ padding: '8px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button title="Edit" onClick={() => openEdit(l)} disabled={busyId === l.id} className="df-icon-btn" style={{ padding: 7 }}>
                            <Icon name="edit" size={15} />
                          </button>
                          <button title="Delete" onClick={() => remove(l)} disabled={busyId === l.id} className="df-icon-btn is-danger" style={{ padding: 7 }}>
                            <Icon name="trash" size={15} />
                          </button>
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

      {/* Add / Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.loadNumber}` : 'New Load'} width={680}>
        {!editing && prefilled.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--color-info-soft)', border: '1px solid var(--color-info-line)', color: 'var(--color-info)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            <Icon name="clipboard" size={16} />
            <span>{prefilled.size} field{prefilled.size !== 1 ? 's' : ''} filled in from your pasted text — check them before saving.</span>
          </div>
        )}
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

      {/* Paste-a-load modal */}
      <Modal open={pasteModal} onClose={() => setPasteModal(false)} title="Paste load details" width={640}>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
          Paste a rate confirmation, broker email or text message and we'll pull out the lane, dates, rate
          and equipment. Nothing is saved until you review it on the next screen.
        </p>

        <Textarea rows={9} value={pasteText} onChange={(e) => { setPasteText(e.target.value); setParsed(null); }}
          placeholder={'Origin: Chicago, IL\nDestination: Gary, IN\nPickup: 07/15/2026 09:00\nRate: $850\nEquipment: Flatbed\nBroker: Atlas Steel Corporation'}
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }} />

        {parsed && (
          <div style={{ marginTop: 16 }}>
            {parsed.matched.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger-line)', color: 'var(--color-danger)', padding: '11px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.55 }}>
                <Icon name="alert" size={16} style={{ marginTop: 2 }} />
                <span>Nothing recognisable in that text. Try including labels like "Rate:", "Pickup:" or a lane like "Chicago, IL → Gary, IN".</span>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                  Found {parsed.matched.length} field{parsed.matched.length !== 1 ? 's' : ''}:
                </div>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
                  {Object.entries(parsed.fields).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 12, padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
                      <span style={{ width: 130, flexShrink: 0, color: 'var(--color-muted)', fontWeight: 600 }}>{PASTE_LABELS[k] ?? k}</span>
                      <span style={{ color: 'var(--color-text)', whiteSpace: 'pre-wrap', minWidth: 0, wordBreak: 'break-word' }}>
                        {k === 'pickupAt' || k === 'deliveryAt' ? fmtDateTime(String(v)) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
                {parsed.unmatched.length > 0 && (
                  <details style={{ marginTop: 10 }}>
                    <summary style={{ fontSize: 12, color: 'var(--color-muted)', cursor: 'pointer' }}>
                      {parsed.unmatched.length} line{parsed.unmatched.length !== 1 ? 's' : ''} weren't recognised
                    </summary>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 6, paddingLeft: 14, lineHeight: 1.7 }}>
                      {parsed.unmatched.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 18 }}>
          <Button variant="secondary" onClick={() => setPasteModal(false)}>Cancel</Button>
          {parsed && parsed.matched.length > 0
            ? <Button onClick={usePasted}>Review &amp; create load →</Button>
            : <Button onClick={runParse} loading={parseText.isPending} disabled={!pasteText.trim()}>Read details</Button>}
        </div>
      </Modal>

      {/* Import CSV modal */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Import loads from CSV" width={640}>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
          Upload a CSV to add many loads at once. Clients are matched by name — any that don't exist yet are created automatically.
          Required columns: <strong>client</strong> and <strong>rate</strong>. Dates like <code>2026-07-15 09:00</code>.
        </p>
        <Button variant="secondary" size="sm" icon="download" onClick={downloadTemplate} style={{ marginBottom: 16 }}>
          Download CSV template
        </Button>

        <input type="file" accept=".csv,text/csv" onChange={(e) => onCsvFile(e.target.files?.[0])}
          style={{ display: 'block', width: '100%', padding: '12px', border: '1.5px dashed var(--color-border-strong)', borderRadius: 12, background: 'var(--color-surface)', color: 'var(--color-muted)', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', cursor: 'pointer' }} />

        {importErr && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger-line)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>
            <Icon name="alert" size={16} /> {importErr}
          </div>
        )}

        {importRows.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>{importRows.length} rows found — preview:</div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)' }}>
                    {['client', 'originCity', 'destCity', 'rate', 'equipment'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--color-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 5).map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                      {['client', 'originCity', 'destCity', 'rate', 'equipment'].map((h) => (
                        <td key={h} style={{ padding: '8px 12px', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{r[h] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {importRows.length > 5 && <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 6 }}>…and {importRows.length - 5} more</div>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={() => setImportModal(false)}>Cancel</Button>
          <Button onClick={runImport} loading={bulkCreate.isPending} disabled={!importRows.length}>Import {importRows.length || ''} loads</Button>
        </div>
      </Modal>
    </div>
  );
}
