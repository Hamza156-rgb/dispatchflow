import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useCreateInvoice } from '../hooks/useApi';
import { useClients, useItemSuggestions } from '../hooks/useApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Button, Input, Textarea, Select, FormField, Toast } from '../components/ui';

interface ItemRow {
  description: string;
  quantity: string;
  rate: string;
}

interface InvoiceForm {
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRate: string;
  notes: string;
  terms: string;
  items: ItemRow[];
}

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { data: clientsData } = useClients({ limit: 200 });
  const createInvoice = useCreateInvoice();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = useForm<InvoiceForm>({
    defaultValues: {
      issueDate: today,
      dueDate: thirtyDays,
      taxRate: '8',
      terms: 'Net 30',
      notes: 'Payment due within agreed terms. Thank you for your business.',
      items: [{ description: '', quantity: '1', rate: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = watch('items');
  const watchTax = watch('taxRate');
  const selectedClient = watch('clientId');

  // Smart suggestions from past invoices (this client first)
  const { data: suggData } = useItemSuggestions(selectedClient || undefined);
  const suggestions: { description: string; rate: number }[] = suggData?.suggestions ?? [];

  // When a known description is chosen, auto-fill its rate (if empty)
  const onDescChange = (idx: number, value: string) => {
    const match = suggestions.find((s) => s.description === value);
    if (match && !getValues(`items.${idx}.rate`)) setValue(`items.${idx}.rate`, String(match.rate));
  };

  const subtotal = watchItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity || '0') * parseFloat(item.rate || '0'));
  }, 0);
  const taxAmount = (subtotal * parseFloat(watchTax || '0')) / 100;
  const total = subtotal + taxAmount;

  const onSubmit = async (data: InvoiceForm) => {
    try {
      const inv = await createInvoice.mutateAsync({
        clientId: data.clientId,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        taxRate: parseFloat(data.taxRate),
        notes: data.notes,
        terms: data.terms,
        items: data.items.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
        })),
      });
      setToast({ msg: 'Invoice created!', type: 'success' });
      setTimeout(() => navigate(`/invoices/${inv.id}`), 800);
    } catch {
      setToast({ msg: 'Failed to create invoice', type: 'error' });
    }
  };

  const card = { background: 'var(--color-bg)', borderRadius: 14, border: '1.5px solid var(--color-border)', padding: '24px 28px', marginBottom: 20 };

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 860, margin: '0 auto' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Client & Dates */}
        <div style={card}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
            Invoice Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16 }}>
            <FormField label="Client" required error={errors.clientId?.message}>
              <Select {...register('clientId', { required: 'Select a client' })}>
                <option value="">Select client…</option>
                {clientsData?.clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Issue Date" required>
              <Input type="date" {...register('issueDate', { required: true })} />
            </FormField>
            <FormField label="Due Date" required>
              <Input type="date" {...register('dueDate', { required: true })} />
            </FormField>
          </div>
        </div>

        {/* Line Items */}
        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
            Line Items
          </h3>
          {suggestions.length > 0 && (
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>
              ✨ {suggestions.length} smart suggestion{suggestions.length !== 1 ? 's' : ''} from past invoices — start typing a description to auto-fill the rate.
            </p>
          )}
          {/* Native autocomplete source for description fields */}
          <datalist id="df-item-suggestions">
            {suggestions.map((s) => <option key={s.description} value={s.description} />)}
          </datalist>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: 560, border: '1.5px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 100px 44px',
              gap: 0, padding: '10px 14px', background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)' }}>
              {['Description', 'Qty', 'Rate ($)', 'Amount', ''].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            {/* Rows */}
            {fields.map((field, idx) => {
              const qty = parseFloat(watchItems[idx]?.quantity || '0');
              const rate = parseFloat(watchItems[idx]?.rate || '0');
              const amt = qty * rate;
              return (
                <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 100px 44px',
                  gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--color-border)',
                  alignItems: 'center' }}>
                  <input placeholder="e.g. Flatbed haul Chicago→Gary"
                    list="df-item-suggestions"
                    {...register(`items.${idx}.description`, { required: true, onChange: (e) => onDescChange(idx, e.target.value) })}
                    style={{ padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 6,
                      background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13,
                      outline: 'none', width: '100%' }} />
                  <input type="number" step="0.01" min="0"
                    {...register(`items.${idx}.quantity`, { required: true, min: 0.01 })}
                    style={{ padding: '8px 8px', border: '1px solid var(--color-border)', borderRadius: 6,
                      background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13,
                      outline: 'none', textAlign: 'right', width: '100%' }} />
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    {...register(`items.${idx}.rate`, { required: true, min: 0.01 })}
                    style={{ padding: '8px 8px', border: '1px solid var(--color-border)', borderRadius: 6,
                      background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13,
                      outline: 'none', textAlign: 'right', width: '100%' }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', textAlign: 'right' }}>
                    ${amt.toFixed(2)}
                  </div>
                  <button type="button" onClick={() => remove(idx)} disabled={fields.length === 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444',
                      fontSize: 16, opacity: fields.length === 1 ? 0.3 : 1, padding: '4px 8px' }}>
                    ✕
                  </button>
                </div>
              );
            })}
            <button type="button" onClick={() => append({ description: '', quantity: '1', rate: '' })}
              style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none',
                color: '#2563eb', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Add Line Item
            </button>
          </div>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <div style={{ width: 280 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Tax Rate (%)</label>
                <input type="number" step="0.1" min="0"
                  {...register('taxRate')}
                  style={{ padding: '7px 10px', border: '1.5px solid var(--color-border)', borderRadius: 7,
                    background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13, outline: 'none', textAlign: 'right' }} />
              </div>
              <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: '14px 16px' }}>
                {[['Subtotal', `$${subtotal.toFixed(2)}`], [`Tax (${watchTax || 0}%)`, `$${taxAmount.toFixed(2)}`]].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: 13, color: 'var(--color-muted)', padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span>{l}</span><span>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0',
                  fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
            <FormField label="Notes">
              <Textarea rows={3} placeholder="Payment instructions, load details…"
                {...register('notes')} />
            </FormField>
            <FormField label="Payment Terms">
              <Select {...register('terms')}>
                {['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on receipt'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={() => navigate('/invoices')}>Cancel</Button>
          <Button type="submit" loading={createInvoice.isPending}>Create Invoice</Button>
        </div>
      </form>
    </div>
  );
}
