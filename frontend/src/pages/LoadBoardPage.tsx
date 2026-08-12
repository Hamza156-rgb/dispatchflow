import { useState } from 'react';
import {
  useLoadBoardStatus, useConnectLoadBoard, useDisconnectLoadBoard,
  useSearchLoadBoard, useImportLoadBoardResults,
} from '../hooks/useApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Button, Input, Select, FormField, PasswordInput, Modal, Spinner, EmptyState, Toast, PageHeader } from '../components/ui';
import type { LoadBoardResult, LoadBoardSearchParams } from '../types';

const EQUIPMENT = ['', 'Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Power Only', 'Box Truck', 'Hotshot'];
const RADII = [25, 50, 100, 150, 250];

const EMPTY_SEARCH: LoadBoardSearchParams = {
  originCity: '', originState: '', destCity: '', destState: '',
  radius: 100, equipment: '', pickupFrom: '', pickupTo: '', minRate: undefined,
};

const money = (n?: number) => (n ? `$${Number(n).toLocaleString('en-US')}` : '—');
const perMile = (r?: number, m?: number) => (r && m ? `$${(r / m).toFixed(2)}` : '—');
const place = (c?: string, s?: string) => [c, s].filter(Boolean).join(', ') || '—';
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

/** "12m ago" — postings go stale fast, so age is the first thing dispatchers read. */
const age = (iso?: string) => {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
};

export default function LoadBoardPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { data: status, isLoading: statusLoading } = useLoadBoardStatus();
  const connectBoard = useConnectLoadBoard();
  const disconnectBoard = useDisconnectLoadBoard();
  const runSearch = useSearchLoadBoard();
  const importResults = useImportLoadBoardResults();

  const [params, setParams] = useState<LoadBoardSearchParams>(EMPTY_SEARCH);
  const [results, setResults] = useState<LoadBoardResult[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [connectModal, setConnectModal] = useState(false);
  const [creds, setCreds] = useState({ username: '', password: '', label: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const set = (k: keyof LoadBoardSearchParams, v: any) => setParams((p) => ({ ...p, [k]: v }));

  const search = async () => {
    try {
      const res = await runSearch.mutateAsync({
        ...params,
        minRate: params.minRate ? Number(params.minRate) : undefined,
      });
      setResults(res.results);
      setSelected(new Set());
      if (!res.results.length) setToast({ msg: 'No postings matched those filters', type: 'info' });
    } catch (e: any) {
      const code = e?.response?.data?.code;
      setToast({
        msg: code === 'NOT_CONNECTED' ? 'Connect your load board account first'
          : code === 'LOADBOARD_AUTH' ? 'Your load board login was rejected — reconnect it'
          : e?.response?.data?.error || 'Search failed',
        type: 'error',
      });
    }
  };

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const importable = (results ?? []).filter((r) => !r.importedAs);
  const allSelected = importable.length > 0 && importable.every((r) => selected.has(r.externalId));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(importable.map((r) => r.externalId)));

  const doImport = async (rows: LoadBoardResult[]) => {
    if (!rows.length) return;
    try {
      const res = await importResults.mutateAsync(rows);
      // Mark them imported in place so the button flips without a re-search —
      // re-searching would spend another API call against the user's quota.
      const byId = new Map<string, string>(res.loads.map((l: any) => [l.externalId, l.loadNumber]));
      setResults((prev) => prev?.map((r) => byId.has(r.externalId) ? { ...r, importedAs: byId.get(r.externalId)! } : r) ?? prev);
      setSelected(new Set());
      setToast({
        msg: `Imported ${res.created} load${res.created !== 1 ? 's' : ''}${res.skipped.length ? ` · ${res.skipped.length} skipped` : ''}`,
        type: res.created ? 'success' : 'error',
      });
    } catch {
      setToast({ msg: 'Import failed', type: 'error' });
    }
  };

  const saveConnection = async () => {
    if (!creds.username.trim()) { setToast({ msg: 'Enter your load board username', type: 'error' }); return; }
    try {
      await connectBoard.mutateAsync(creds);
      setConnectModal(false);
      setCreds({ username: '', password: '', label: '' });
      setToast({ msg: 'Load board account connected', type: 'success' });
    } catch {
      setToast({ msg: 'Could not save those credentials', type: 'error' });
    }
  };

  const th: React.CSSProperties = { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'left' };
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap' };

  if (statusLoading) return <Spinner />;

  return (
    <div style={{ padding: isMobile ? 16 : 26 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        icon="search"
        title="Load Board"
        subtitle={`Search ${status?.provider ?? 'DAT'} postings and pull the ones you book straight into your loads.`}
      />

      {/* Demo-data banner — no live credentials configured on the server yet */}
      {status?.mock && (
        <div style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: '1px solid var(--color-warning-line)', borderRadius: 12, padding: '12px 16px', marginBottom: 18, fontSize: 13, lineHeight: 1.6 }}>
          <strong>Demo data.</strong> The server is running the sample load board, so these postings are made up.
          Everything else here is real — search, filters, import and duplicate detection all behave exactly as they
          will once the {status.provider} API credentials are configured.
        </div>
      )}

      {/* Connection card */}
      <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '16px 20px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: status?.connected ? 'var(--color-success-soft)' : 'var(--color-neutral-soft)' }}>
            {status?.connected ? '🔗' : '🔌'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
              {status?.connected ? `${status.provider} connected` : `${status?.provider ?? 'DAT'} not connected`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
              {status?.connected
                ? `${status.account}${status.lastUsedAt ? ` · last search ${age(status.lastUsedAt)}` : ''}`
                : 'Connect the load board account you already subscribe to.'}
            </div>
            {status?.lastError && (
              <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>⚠️ {status.lastError}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {status?.connected && (
            <Button variant="secondary" loading={disconnectBoard.isPending}
              onClick={async () => {
                if (!confirm('Disconnect this load board account?')) return;
                await disconnectBoard.mutateAsync();
                setResults(null);
                setToast({ msg: 'Disconnected', type: 'success' });
              }}>Disconnect</Button>
          )}
          <Button variant={status?.connected ? 'secondary' : 'primary'} onClick={() => setConnectModal(true)}>
            {status?.connected ? 'Change account' : '🔗 Connect account'}
          </Button>
        </div>
      </div>

      {/* Search panel */}
      <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '18px 20px', marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 2fr 1fr 1fr', gap: 12 }}>
          <FormField label="Origin City"><Input value={params.originCity} onChange={(e) => set('originCity', e.target.value)} placeholder="Chicago" /></FormField>
          <FormField label="State"><Input value={params.originState} onChange={(e) => set('originState', e.target.value)} placeholder="IL" maxLength={2} /></FormField>
          <FormField label="Dest City"><Input value={params.destCity} onChange={(e) => set('destCity', e.target.value)} placeholder="Any" /></FormField>
          <FormField label="State"><Input value={params.destState} onChange={(e) => set('destState', e.target.value)} placeholder="Any" maxLength={2} /></FormField>
          <FormField label="Radius (mi)">
            <Select value={String(params.radius)} onChange={(e) => set('radius', Number(e.target.value))}>
              {RADII.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12 }}>
          <FormField label="Equipment">
            <Select value={params.equipment} onChange={(e) => set('equipment', e.target.value)}>
              {EQUIPMENT.map((e) => <option key={e} value={e}>{e || 'Any equipment'}</option>)}
            </Select>
          </FormField>
          <FormField label="Pickup from"><Input type="date" value={params.pickupFrom} onChange={(e) => set('pickupFrom', e.target.value)} /></FormField>
          <FormField label="Pickup to"><Input type="date" value={params.pickupTo} onChange={(e) => set('pickupTo', e.target.value)} /></FormField>
          <FormField label="Min rate ($)"><Input type="number" value={params.minRate ?? ''} onChange={(e) => set('minRate', e.target.value)} placeholder="Any" /></FormField>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => { setParams(EMPTY_SEARCH); setResults(null); }}>Reset</Button>
          <Button onClick={search} loading={runSearch.isPending} disabled={!status?.connected}>🔎 Search loads</Button>
        </div>
      </div>

      {/* Results */}
      {results !== null && (
        <div style={{ background: 'var(--color-bg)', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              {results.length} posting{results.length !== 1 ? 's' : ''}
              {selected.size > 0 && <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}> · {selected.size} selected</span>}
            </div>
            <Button
              onClick={() => doImport(results.filter((r) => selected.has(r.externalId)))}
              loading={importResults.isPending}
              disabled={!selected.size}
            >
              ⬇️ Import {selected.size || ''} to my loads
            </Button>
          </div>

          {!results.length ? (
            <EmptyState icon="🔎" title="No postings found" description="Widen the radius or clear a filter and search again." />
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 1040, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)' }}>
                    <th style={{ ...th, width: 40 }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleAll}
                        disabled={!importable.length} title="Select all importable" style={{ cursor: 'pointer' }} />
                    </th>
                    <th style={th}>Age</th>
                    <th style={th}>Route</th>
                    <th style={th}>Pickup</th>
                    <th style={{ ...th, textAlign: 'right' }}>Miles</th>
                    <th style={{ ...th, textAlign: 'right' }}>Rate</th>
                    <th style={{ ...th, textAlign: 'right' }}>$/mi</th>
                    <th style={th}>Equipment</th>
                    <th style={th}>Broker</th>
                    <th style={{ ...th, textAlign: 'center' }}>Import</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.externalId} style={{ borderBottom: '1px solid var(--color-border)', opacity: r.importedAs ? 0.55 : 1 }}>
                      <td style={{ padding: '12px 16px' }}>
                        <input type="checkbox" checked={selected.has(r.externalId)} disabled={!!r.importedAs}
                          onChange={() => toggle(r.externalId)} style={{ cursor: r.importedAs ? 'not-allowed' : 'pointer' }} />
                      </td>
                      <td style={{ ...td, color: 'var(--color-muted)' }}>{age(r.postedAt)}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{place(r.originCity, r.originState)}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>→ {place(r.destCity, r.destState)}</div>
                      </td>
                      <td style={{ ...td, color: 'var(--color-muted)' }}>{fmtDate(r.pickupAt)}</td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--color-muted)' }}>{r.miles ?? '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 800 }}>
                        {r.rate ? money(r.rate) : <span style={{ fontWeight: 600, color: 'var(--color-muted)', fontSize: 12 }}>Call for rate</span>}
                      </td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--color-muted)' }}>{perMile(r.rate, r.miles)}</td>
                      <td style={{ ...td, color: 'var(--color-muted)' }}>{r.equipment ?? '—'}</td>
                      <td style={td}>
                        <div>{r.companyName ?? '—'}</div>
                        {r.contactPhone && <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{r.contactPhone}</div>}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        {r.importedAs ? (
                          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-soft)', whiteSpace: 'nowrap' }}>
                            ✓ {r.importedAs}
                          </span>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => doImport([r])} disabled={importResults.isPending}>
                            Import
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {results === null && status?.connected && (
        <EmptyState icon="🚛" title="Search the board"
          description="Pick an origin and hit search. Postings you import become loads you can invoice." />
      )}

      {/* Connect modal */}
      <Modal open={connectModal} onClose={() => setConnectModal(false)} title={`Connect your ${status?.provider ?? 'DAT'} account`} width={520}>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
          Load boards license access per seat, so DispatchFlow searches using <strong>your own</strong> subscription.
          Credentials are encrypted before they're stored and are never sent back to the browser.
        </p>
        {status?.mock && (
          <div style={{ background: 'var(--color-info-soft)', color: 'var(--color-info)', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
            The server is in demo mode, so anything you enter here will connect — it's for trying the flow.
          </div>
        )}
        <FormField label={`${status?.provider ?? 'DAT'} username / email`} required>
          <Input value={creds.username} onChange={(e) => setCreds({ ...creds, username: e.target.value })} placeholder="dispatch@yourcompany.com" autoComplete="off" />
        </FormField>
        <FormField label="Password">
          <PasswordInput value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} placeholder="Leave blank if your plan doesn't need it" autoComplete="new-password" />
        </FormField>
        <FormField label="Label (optional)">
          <Input value={creds.label} onChange={(e) => setCreds({ ...creds, label: e.target.value })} placeholder="e.g. Main dispatch seat" />
        </FormField>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setConnectModal(false)}>Cancel</Button>
          <Button onClick={saveConnection} loading={connectBoard.isPending}>Save connection</Button>
        </div>
      </Modal>
    </div>
  );
}
