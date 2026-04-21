import { useState, useCallback } from 'react';
import { fraudApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import type { FraudFlag } from '../types';

const FLAG_STATUSES = ['OPEN', 'CONFIRMED', 'DISMISSED'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'];

export default function FraudFlagsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [reviewing, setReviewing] = useState<FraudFlag | null>(null);
  const [resolution, setResolution] = useState('CONFIRMED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchFlags = useCallback(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (severityFilter) params.severity = severityFilter;
    return fraudApi.list(params);
  }, [statusFilter, severityFilter]);

  const { data: flags, loading, error, run } = useAsync<FraudFlag[]>(fetchFlags);

  const handleReview = async () => {
    if (!reviewing) return;
    setActionLoading(true);
    try {
      await fraudApi.review(reviewing.id, resolution, reviewNotes);
      setFeedback('Fraud flag reviewed successfully.');
      setReviewing(null);
      setReviewNotes('');
      run();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Review failed';
      setFeedback(`Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'HIGH':
        return 'bg-red-100 text-red-700';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700';
      case 'LOW':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Fraud Flags</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          {FLAG_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Severities</option>
          {SEVERITIES.map((s) => (
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

      {!loading && !error && flags && (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Collector</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {flags.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No fraud flags found.
                  </td>
                </tr>
              )}
              {flags.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {f.type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColor(f.severity)}`}
                    >
                      {f.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        f.status === 'OPEN'
                          ? 'bg-yellow-100 text-yellow-700'
                          : f.status === 'CONFIRMED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {f.collectorId.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {f.jobId.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {f.status === 'OPEN' ? (
                      <button
                        onClick={() => {
                          setReviewing(f);
                          setResolution('CONFIRMED');
                          setReviewNotes('');
                        }}
                        className="rounded bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100"
                      >
                        Review
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {f.reviewNotes ? `"${f.reviewNotes}"` : 'Reviewed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Review Fraud Flag
            </h3>

            <div className="mb-3 rounded border bg-gray-50 p-3 text-sm">
              <p>
                <strong>Type:</strong> {reviewing.type.replace(/_/g, ' ')}
              </p>
              <p>
                <strong>Severity:</strong>{' '}
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${severityColor(reviewing.severity)}`}>
                  {reviewing.severity}
                </span>
              </p>
              {reviewing.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-500">
                    Details JSON
                  </summary>
                  <pre className="mt-1 overflow-auto text-xs text-gray-600">
                    {JSON.stringify(reviewing.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Resolution
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full rounded border px-3 py-1.5 text-sm"
              >
                <option value="CONFIRMED">Confirm (Fraud is real)</option>
                <option value="DISMISSED">Dismiss (False positive)</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Review Notes
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Provide review notes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReviewing(null)}
                disabled={actionLoading}
                className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={actionLoading}
                className="rounded bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
