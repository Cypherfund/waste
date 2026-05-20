import { useState, useCallback } from 'react';
import { pendingPaymentsApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import HelpGuide from '../components/HelpGuide';
import type { PendingPayment } from '../types';
import { CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react';

const MODE_LABEL: Record<string, string> = {
  MANUAL_PROVIDER: 'Manual Provider',
  CASH: 'Cash',
  INTEGRATED_PROVIDER: 'Integrated',
  NONE: 'None',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  AWAITING_ADMIN_VERIFICATION: 'bg-blue-100 text-blue-700',
  VERIFIED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function PendingPaymentsPage() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectJobId, setRejectJobId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState('');

  const fetchPayments = useCallback(() => pendingPaymentsApi.list(), []);
  const { data: payments, loading, error, run } = useAsync<PendingPayment[]>(fetchPayments);

  const handleVerify = async (jobId: string) => {
    setActionId(jobId);
    try {
      await pendingPaymentsApi.verify(jobId);
      setFeedback(`Payment verified for job ${jobId.slice(0, 8)}`);
      run();
    } catch (e: unknown) {
      setFeedback((e as Error).message ?? 'Error verifying payment');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectJobId) return;
    setActionId(rejectJobId);
    try {
      await pendingPaymentsApi.reject(rejectJobId, rejectReason || 'Rejected by admin');
      setFeedback(`Payment rejected for job ${rejectJobId.slice(0, 8)}`);
      setRejectJobId(null);
      setRejectReason('');
      run();
    } catch (e: unknown) {
      setFeedback((e as Error).message ?? 'Error rejecting payment');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pending Payments</h1>
          <p className="text-sm text-gray-500">Review and verify manual payment submissions</p>
        </div>
        <button
          onClick={run}
          className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <HelpGuide
        title="How to Review Pending Payments"
        description="Review manual payment submissions from collectors and households before processing payouts."
        steps={[
          "Review the payment mode (Cash, Manual Provider, or Integrated)",
          "Check the payment proof image for validity",
          "Verify the payment amount matches the job amount",
          "Click Verify to approve or Reject to decline with a reason",
        ]}
        tips={[
          "Cash payments require photo proof of the transaction",
          "Manual Provider payments need confirmation from the payment provider",
          "Always verify the proof image before approving",
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
                <th className="px-4 py-3">Job ID</th>
                <th className="px-4 py-3">Household</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Method / Ref</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(!payments || payments.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    No pending payments.
                  </td>
                </tr>
              )}
              {payments?.map((p) => (
                <tr key={p.jobId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.jobId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {p.householdName ?? p.householdId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.scheduledDate}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="rounded bg-gray-100 px-2 py-0.5">
                      {MODE_LABEL[p.paymentMode] ?? p.paymentMode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div>{p.paymentMethod ?? '—'}</div>
                    {p.paymentRef && <div className="font-mono text-gray-400">{p.paymentRef}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800">
                    {p.quotedPrice != null ? `${Number(p.quotedPrice).toLocaleString()} XAF` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.paymentProofUrl ? (
                      <a
                        href={p.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        View <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleVerify(p.jobId)}
                        disabled={actionId === p.jobId}
                        title="Verify payment"
                        className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-40"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => { setRejectJobId(p.jobId); setRejectReason(''); }}
                        disabled={actionId === p.jobId}
                        title="Reject payment"
                        className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-40"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-bold text-gray-900">Reject Payment</h2>
            <p className="mb-3 text-sm text-gray-500">
              Job <span className="font-mono">{rejectJobId.slice(0, 8)}</span>
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRejectJobId(null)}
                className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionId === rejectJobId}
                className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionId === rejectJobId ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
