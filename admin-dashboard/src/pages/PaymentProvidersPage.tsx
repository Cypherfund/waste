import { useState, useCallback } from 'react';
import { paymentProvidersApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import type { PaymentProvider } from '../types';
import { Plus, Pencil, Trash2, Check, X, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

const EMPTY_FORM: Partial<PaymentProvider> = {
  paymentCode: '',
  countryCode: '',
  providerName: '',
  currency: 'XAF',
  minDeposit: null,
  maxDeposit: null,
  minWithdrawal: null,
  maxWithdrawal: null,
  supportsCashin: true,
  supportsCashout: false,
  imageUrl: null,
  isGlobal: false,
  isEnabled: true,
  manualPaymentPhone: null,
  manualPaymentAccountName: null,
};

export default function PaymentProvidersPage() {
  const [countryFilter, setCountryFilter] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<PaymentProvider | null>(null);
  const [form, setForm] = useState<Partial<PaymentProvider>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncCountry, setSyncCountry] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<PaymentProvider | null>(null);

  const fetchProviders = useCallback(
    () => paymentProvidersApi.list(countryFilter || undefined),
    [countryFilter],
  );
  const { data: providers, loading, error, run } = useAsync<PaymentProvider[]>(fetchProviders);

  const countries = providers
    ? [...new Set(providers.map((p) => p.countryCode).filter(Boolean))].sort()
    : [];

  const filtered = providers
    ? countryFilter
      ? providers.filter((p) => p.countryCode === countryFilter)
      : providers
    : [];

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setModal('create');
  };

  const openEdit = (p: PaymentProvider) => {
    setEditing(p);
    setForm({ ...p });
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'create') {
        await paymentProvidersApi.create(form);
        setFeedback('Provider created.');
      } else if (editing) {
        await paymentProvidersApi.update(editing.id, form);
        setFeedback('Provider updated.');
      }
      closeModal();
      run();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Save failed';
      setFeedback(`Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: PaymentProvider) => {
    try {
      await paymentProvidersApi.update(p.id, { isEnabled: !p.isEnabled });
      run();
    } catch {
      setFeedback('Toggle failed');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await paymentProvidersApi.remove(confirmDelete.id);
      setConfirmDelete(null);
      setFeedback('Provider deleted.');
      run();
    } catch {
      setFeedback('Delete failed');
    }
  };

  const handleSync = async () => {
    const code = syncCountry.trim().toUpperCase();
    if (!code) {
      setFeedback('Enter a country code to sync (e.g. CM).');
      return;
    }
    setSyncing(true);
    try {
      const result = await paymentProvidersApi.sync(code);
      setFeedback(`Sync complete for ${code}: ${(result as { synced?: number; updated?: number }).synced ?? 0} new, ${(result as { synced?: number; updated?: number }).updated ?? 0} updated.`);
      run();
    } catch {
      setFeedback('Sync failed. Check the country code and gateway connectivity.');
    } finally {
      setSyncing(false);
    }
  };

  const setField = (key: keyof PaymentProvider, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payment Providers</h1>
        <div className="flex items-center gap-2">
          <input
            value={syncCountry}
            onChange={(e) => setSyncCountry(e.target.value.toUpperCase())}
            placeholder="Country code (e.g. CM)"
            maxLength={10}
            className="w-44 rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            onClick={handleSync}
            disabled={syncing || !syncCountry.trim()}
            className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus size={14} /> Add Provider
          </button>
        </div>
      </div>

      {/* Country filter */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={countryFilter}
          onChange={(e) => { setCountryFilter(e.target.value); if (e.target.value) setSyncCountry(e.target.value); }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{filtered.length} provider(s)</span>
      </div>

      {feedback && (
        <div className="mb-4 flex items-center gap-2 rounded bg-blue-50 p-3 text-sm text-blue-700">
          <span className="flex-1">{feedback}</span>
          <button onClick={() => setFeedback('')} className="text-blue-400 hover:text-blue-600">
            <X size={14} />
          </button>
        </div>
      )}

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={run} />}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Cashin</th>
                <th className="px-4 py-3">Cashout</th>
                <th className="px-4 py-3">Limits (dep/with)</th>
                <th className="px-4 py-3">Manual Phone</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    No providers found.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.providerName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.paymentCode}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{p.countryCode}</span>
                    {p.isGlobal && (
                      <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">global</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{p.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${p.supportsCashin ? 'text-green-600' : 'text-gray-400'}`}>
                      {p.supportsCashin ? '✓' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${p.supportsCashout ? 'text-green-600' : 'text-gray-400'}`}>
                      {p.supportsCashout ? '✓' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.minDeposit ?? '—'} / {p.minWithdrawal ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {p.manualPaymentPhone ?? '—'}
                    {p.manualPaymentAccountName && (
                      <div className="text-gray-400">{p.manualPaymentAccountName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(p)} title="Toggle enabled">
                      {p.isEnabled ? (
                        <ToggleRight size={20} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={20} className="text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-bold text-gray-900">
                {modal === 'create' ? 'Add Provider' : 'Edit Provider'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment Code" required>
                  <input
                    value={form.paymentCode ?? ''}
                    onChange={(e) => setField('paymentCode', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="e.g. MTN_MOMO"
                  />
                </Field>
                <Field label="Provider Name" required>
                  <input
                    value={form.providerName ?? ''}
                    onChange={(e) => setField('providerName', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="e.g. MTN Mobile Money"
                  />
                </Field>
                <Field label="Country Code" required>
                  <input
                    value={form.countryCode ?? ''}
                    onChange={(e) => setField('countryCode', e.target.value.toUpperCase())}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="e.g. CM"
                    maxLength={10}
                  />
                </Field>
                <Field label="Currency" required>
                  <input
                    value={form.currency ?? ''}
                    onChange={(e) => setField('currency', e.target.value.toUpperCase())}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="e.g. XAF"
                    maxLength={3}
                  />
                </Field>
                <Field label="Min Deposit">
                  <input
                    type="number"
                    value={form.minDeposit ?? ''}
                    onChange={(e) => setField('minDeposit', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Max Deposit">
                  <input
                    type="number"
                    value={form.maxDeposit ?? ''}
                    onChange={(e) => setField('maxDeposit', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Min Withdrawal">
                  <input
                    type="number"
                    value={form.minWithdrawal ?? ''}
                    onChange={(e) => setField('minWithdrawal', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Max Withdrawal">
                  <input
                    type="number"
                    value={form.maxWithdrawal ?? ''}
                    onChange={(e) => setField('maxWithdrawal', e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Image URL" span={2}>
                  <input
                    value={form.imageUrl ?? ''}
                    onChange={(e) => setField('imageUrl', e.target.value || null)}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Manual Payment Phone">
                  <input
                    value={form.manualPaymentPhone ?? ''}
                    onChange={(e) => setField('manualPaymentPhone', e.target.value || null)}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="+237..."
                  />
                </Field>
                <Field label="Manual Account Name">
                  <input
                    value={form.manualPaymentAccountName ?? ''}
                    onChange={(e) => setField('manualPaymentAccountName', e.target.value || null)}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="Account holder name"
                  />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-4">
                <Toggle label="Supports Cashin" value={!!form.supportsCashin} onChange={(v) => setField('supportsCashin', v)} />
                <Toggle label="Supports Cashout" value={!!form.supportsCashout} onChange={(v) => setField('supportsCashout', v)} />
                <Toggle label="Global" value={!!form.isGlobal} onChange={(v) => setField('isGlobal', v)} />
                <Toggle label="Enabled" value={!!form.isEnabled} onChange={(v) => setField('isEnabled', v)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button
                onClick={closeModal}
                className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.paymentCode || !form.providerName || !form.countryCode}
                className="inline-flex items-center gap-1.5 rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? '...' : <><Check size={13} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-bold text-gray-900">Delete Provider?</h2>
            <p className="mb-4 text-sm text-gray-500">
              Delete <strong>{confirmDelete.providerName}</strong> ({confirmDelete.countryCode})? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  required,
  span,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  span?: number;
}) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-green-500' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-1'}`}
        />
      </button>
      {label}
    </label>
  );
}
