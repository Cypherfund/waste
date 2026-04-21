import { useState, useCallback } from 'react';
import { disputesApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import type { Dispute } from '../types';

const DISPUTE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED_ACCEPTED', 'RESOLVED_REJECTED'];

export default function DisputesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [resolving, setResolving] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('RESOLVED_ACCEPTED');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchDisputes = useCallback(
    () => disputesApi.list(statusFilter || undefined),
    [statusFilter],
  );
  const { data: disputes, loading, error, run } = useAsync<Dispute[]>(fetchDisputes);

  const handleResolve = async () => {
    if (!resolving) return;
    setActionLoading(true);
    try {
      await disputesApi.resolve(resolving.id, resolution, adminNotes);
      setFeedback('Dispute resolved successfully.');
      setResolving(null);
      setAdminNotes('');
      run();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Resolution failed';
      setFeedback(`Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Disputes</h1>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          {DISPUTE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {feedback && (
        <div className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
          {feedback}
          <button onClick={() => setFeedback('')} className="ml-2 text-blue-500 underline">
            dismiss
          </button>
        </div>
      )}

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={run} />}

      {!loading && !error && disputes && (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {disputes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No disputes found.
                  </td>
                </tr>
              )}
              {disputes.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {d.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {d.jobId.slice(0, 8)}...
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-700">
                    {d.reason}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.status === 'OPEN'
                          ? 'bg-yellow-100 text-yellow-700'
                          : d.status.startsWith('RESOLVED')
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {d.status === 'OPEN' || d.status === 'UNDER_REVIEW' ? (
                      <button
                        onClick={() => {
                          setResolving(d);
                          setResolution('RESOLVED_ACCEPTED');
                          setAdminNotes('');
                        }}
                        className="rounded bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-100"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {d.adminNotes ? `"${d.adminNotes}"` : 'Resolved'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolve Modal */}
      {resolving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Resolve Dispute
            </h3>
            <p className="mb-3 text-sm text-gray-600">
              <strong>Reason:</strong> {resolving.reason}
            </p>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Resolution
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full rounded border px-3 py-1.5 text-sm"
              >
                <option value="RESOLVED_ACCEPTED">Accept (Household is right)</option>
                <option value="RESOLVED_REJECTED">Reject (Collector is right)</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Admin Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Provide resolution notes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResolving(null)}
                disabled={actionLoading}
                className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={actionLoading}
                className="rounded bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {actionLoading ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
