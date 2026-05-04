import { useState, useCallback } from 'react';
import { subscriptionPlansApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import type { SubscriptionPlan } from '../types';
import { Plus, Pencil, Check, X } from 'lucide-react';

interface PlanForm {
  name: string;
  price: string;
  pickupsPerWeek: string;
  description: string;
  isActive: boolean;
}

const emptyForm: PlanForm = {
  name: '',
  price: '',
  pickupsPerWeek: '2',
  description: '',
  isActive: true,
};

export default function SubscriptionsPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchPlans = useCallback(() => subscriptionPlansApi.list(), []);
  const { data: plans, loading, error, run } = useAsync<SubscriptionPlan[]>(fetchPlans);

  const startEdit = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setShowCreate(false);
    setForm({
      name: plan.name,
      price: String(plan.price),
      pickupsPerWeek: String(plan.pickupsPerWeek),
      description: plan.description ?? '',
      isActive: plan.isActive,
    });
  };

  const startCreate = () => {
    setShowCreate(true);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        pickupsPerWeek: Number(form.pickupsPerWeek),
        description: form.description.trim() || undefined,
        isActive: form.isActive,
      };

      if (editingId) {
        await subscriptionPlansApi.update(editingId, payload);
        setFeedback('Plan updated.');
        setEditingId(null);
      } else {
        await subscriptionPlansApi.create(payload);
        setFeedback('Plan created.');
        setShowCreate(false);
      }
      run();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed';
      setFeedback(`Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      await subscriptionPlansApi.update(plan.id, { isActive: !plan.isActive });
      run();
    } catch {
      setFeedback('Failed to update plan status.');
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          <Plus size={15} /> New Plan
        </button>
      </div>

      {feedback && (
        <div className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
          {feedback}
          <button onClick={() => setFeedback('')} className="ml-2 text-blue-500 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-800">New Plan</h2>
          <PlanFormFields form={form} onChange={setForm} />
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check size={13} /> {saving ? 'Saving…' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={run} />}

      {!loading && !error && plans && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.length === 0 && (
            <p className="col-span-3 py-12 text-center text-sm text-gray-400">
              No plans yet. Create one above.
            </p>
          )}
          {plans.map((plan) =>
            editingId === plan.id ? (
              <div key={plan.id} className="rounded-xl border-2 border-green-600 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-gray-800">Edit Plan</h3>
                <PlanFormFields form={form} onChange={setForm} />
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check size={13} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <X size={13} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={plan.id}
                className={`rounded-xl border bg-white p-5 shadow-sm ${
                  plan.isActive ? 'border-green-200' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-bold text-gray-900">{plan.name}</p>
                    {plan.description && (
                      <p className="mt-1 text-xs text-gray-500">{plan.description}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      plan.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-4 space-y-1.5">
                  <PlanStat label="Price" value={`${plan.price.toLocaleString()} XAF / month`} />
                  <PlanStat label="Pickups / week" value={String(plan.pickupsPerWeek)} />
                  <PlanStat
                    label="Monthly pickups"
                    value={`${plan.pickupsPerWeek * 4} (${(plan.pickupsPerWeek * 4 * 1000).toLocaleString()} XAF at pay-per-pickup)`}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(plan)}
                    className="inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(plan)}
                    className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium ${
                      plan.isActive
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {plan.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <div className="mt-8 rounded-lg border bg-yellow-50 p-4 text-sm text-yellow-800">
        <strong>Pricing config</strong> — base prices are managed in the{' '}
        <a href="/config" className="underline font-medium">
          Config page
        </a>{' '}
        under the <code className="rounded bg-yellow-100 px-1">pricing</code> category.
      </div>
    </div>
  );
}

function PlanFormFields({
  form,
  onChange,
}: {
  form: PlanForm;
  onChange: (f: PlanForm) => void;
}) {
  const set = (key: keyof PlanForm, value: string | boolean) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-gray-700">Name</label>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Standard Plan"
          className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">Price (XAF / month)</label>
        <input
          type="number"
          value={form.price}
          onChange={(e) => set('price', e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">Pickups per week</label>
        <input
          type="number"
          value={form.pickupsPerWeek}
          onChange={(e) => set('pickupsPerWeek', e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-gray-700">Description (optional)</label>
        <input
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Short description shown to users"
          className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={form.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-green-600"
        />
        <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">Active (visible to users)</label>
      </div>
    </div>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}
