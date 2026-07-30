import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useClients, useCreateClient, useBulkCreateClients } from '../hooks/useApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Button, Input, Modal, FormField, Spinner, EmptyState, Avatar, Pagination, Toast, Textarea } from '../components/ui';
import type { ClientPayload } from '../types';

const CLIENT_CSV_COLUMNS = ['companyName', 'contactPerson', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'country', 'notes'];

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

export default function ClientsPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErr, setImportErr] = useState('');

  const { data, isLoading } = useClients({ page, limit: 12, search: search || undefined });
  const createClient = useCreateClient();
  const bulkCreate = useBulkCreateClients();

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

  // ── CSV import ──────────────────────────────────────────────
  const downloadTemplate = () => {
    const example = ['Atlas Steel Corporation', 'Dana Park', 'dana@atlassteel.com', '+1 555 0100', '123 Mill Rd', 'Chicago', 'IL', '60601', 'USA', 'Net 30 terms'];
    const csv = CLIENT_CSV_COLUMNS.join(',') + '\n' + example.map((v) => (/[",\n]/.test(v) ? `"${v}"` : v)).join(',') + '\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'clients-template.csv'; a.click(); URL.revokeObjectURL(url);
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
      const parts = [`Imported ${res.created} client${res.created !== 1 ? 's' : ''}`];
      if (res.skipped) parts.push(`${res.skipped} already existed`);
      if (res.failed) parts.push(`${res.failed} skipped`);
      setToast({ msg: parts.join(' · '), type: res.created ? 'success' : 'error' });
    } catch {
      setToast({ msg: 'Import failed', type: 'error' });
    }
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
          <Input placeholder="Search clients…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={() => { setImportRows([]); setImportErr(''); setImportModal(true); }}>⬆️ Import CSV</Button>
          <Button onClick={() => setModal(true)}>+ Add Client</Button>
        </div>
      </div>

      {isLoading ? <Spinner /> : !data?.clients.length ? (
        <EmptyState icon="🏢" title="No clients found"
          description={search ? 'Try a different search.' : 'Add your first client to get started.'}
          action={<Button onClick={() => setModal(true)}>+ Add Client</Button>} />
      ) : (
        <>
          <div style={{ background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: 'var(--color-surface)' }}>
                  {['Company', 'Contact', 'Email', 'Invoices', ''].map((h) => (
                    <th key={h} style={{ padding: '12px 18px', textAlign: h === 'Invoices' ? 'center' : 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.clients.map((c: any) => (
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
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

      {/* Add Client modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Client" width={560}>
        <form onSubmit={handleSubmit(onCreate)}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 16 }}>
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

      {/* Import CSV modal */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Import clients from CSV" width={620}>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
          Upload a CSV to add many clients at once. Only <strong>companyName</strong> is required.
          Clients that already exist (same name) are skipped.
        </p>
        <button onClick={downloadTemplate} style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'inherit', marginBottom: 16 }}>
          ⬇️ Download CSV template
        </button>

        <input type="file" accept=".csv,text/csv" onChange={(e) => onCsvFile(e.target.files?.[0])}
          style={{ display: 'block', width: '100%', padding: '10px', border: '1.5px dashed var(--color-border)', borderRadius: 10, background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }} />

        {importErr && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>⚠️ {importErr}</div>}

        {importRows.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>{importRows.length} rows found — preview:</div>
            <div style={{ overflowX: 'auto', border: '1.5px solid var(--color-border)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)' }}>
                    {['companyName', 'contactPerson', 'email', 'city'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--color-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 5).map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                      {['companyName', 'contactPerson', 'email', 'city'].map((h) => (
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
          <Button onClick={runImport} loading={bulkCreate.isPending} disabled={!importRows.length}>Import {importRows.length || ''} clients</Button>
        </div>
      </Modal>
    </div>
  );
}
