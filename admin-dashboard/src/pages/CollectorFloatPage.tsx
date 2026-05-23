import { useState, useCallback } from 'react';
import { collectorFloatApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import HelpGuide from '../components/HelpGuide';
import type { CollectorFloat } from '../types';
import { RefreshCw, PlusCircle, X, Check } from 'lucide-react';

export default function CollectorFloatPage() {
  const [topUpTarget, setTopUpTarget] = useState<CollectorFloat | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchFloats = useCallback(() => collectorFloatApi.list(), []);
  const { data: collectors, loading, error, run } = useAsync<CollectorFloat[]>(fetchFloats);

  const openTopUp = (c: CollectorFloat) => {
    setTopUpTarget(c);
    setAmount('');
    setNote('');
  };

  const handleTopUp = async () => {
    if (!topUpTarget || !amount) return;
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return;
    setSaving(true);
    try {
      await collectorFloatApi.topUp(topUpTarget.collectorId, amt, note || undefined);
      setFeedback(`Float topped up: +${amt.toLocaleString()} XAF for ${topUpTarget.collectorName ?? topUpTarget.collectorId.slice(0, 8)}`);
      setTopUpTarget(null);
      run();
    } catch (e: unknown) {
      setFeedback((e as Error).message ?? 'Top-up failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Collector Float Balances</h1>
          <p className="text-sm text-gray-500">Manage float balances for cash-payment collectors</p>
        </div>
        <button
          onClick={run}
          className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <HelpGuide
        title="How to Manage Collector Float Balances"
        description="Top up and monitor float balances for cash-payment collectors."
        steps={[
          "View all collectors and their current float balances",
          "Low balance (< 500 XAF) is highlighted in red",
          "Click 'Top Up' to add funds to a collector's float",
          "Enter the amount and optional note for the top-up",
          "Top-ups are recorded in the collector's transaction history",
        ]}
        tips={[
          "Float balances are used for cash payments at households",
          "Keep collector floats above 500 XAF to avoid payment issues",
          "Regular top-ups ensure smooth cash payment operations",
        ]}
      />

      {feedback && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {feedback}
        </div>
      )}

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Collector</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Float Balance</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(!collectors || collectors.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    No collectors found.
                  </td>
                </tr>
              )}
              {collectors?.map((c) => (
                <tr key={c.collectorId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.collectorName ?? c.collectorId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.collectorPhone ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${c.collectorFloatBalance < 500 ? 'text-red-600' : 'text-gray-800'}`}>
                      {Number(c.collectorFloatBalance).toLocaleString()} XAF
                    </span>
                    {c.collectorFloatBalance < 500 && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">Low</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openTopUp(c)}
                      className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                    >
                      <PlusCircle size={13} /> Top Up
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top-Up Modal */}
      {topUpTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Top Up Float</h2>
              <button onClick={() => setTopUpTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="mb-1 text-sm text-gray-600">
              Collector: <strong>{topUpTarget.collectorName ?? topUpTarget.collectorId.slice(0, 8)}</strong>
            </p>
            <p className="mb-4 text-sm text-gray-500">
              Current balance:{' '}
              <strong>{Number(topUpTarget.collectorFloatBalance).toLocaleString()} XAF</strong>
            </p>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Amount (XAF) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <label className="mb-1 block text-xs font-medium text-gray-600">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Monthly float allocation"
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTopUpTarget(null)}
                className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTopUp}
                disabled={saving || !amount || Number(amount) <= 0}
                className="inline-flex items-center gap-1.5 rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? '…' : <><Check size={13} /> Top Up</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
