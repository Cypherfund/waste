import { useState, useCallback } from 'react';
import { pendingPaymentsApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import HelpGuide from '../components/HelpGuide';
import type { PendingPayment } from '../types';
import { CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react';

type FilterTab = 'all' | 'job' | 'subscription' | 'wallet';

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

const rowKey = (p: PendingPayment) => {
  if (p.paymentSource === 'SUBSCRIPTION_PAYMENT') return `sub-${p.subscriptionId}`;
  if (p.paymentSource === 'WALLET_TOPUP') return `wallet-${p.transactionId}`;
  return `job-${p.jobId}`;
};

const rowId = (p: PendingPayment) => {
  if (p.paymentSource === 'SUBSCRIPTION_PAYMENT') return p.subscriptionId!;
  if (p.paymentSource === 'WALLET_TOPUP') return p.transactionId!;
  return p.jobId!;
};

export default function PendingPaymentsPage() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectItem, setRejectItem] = useState<PendingPayment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const fetchPayments = useCallback(() => pendingPaymentsApi.list(), []);
  const { data: payments, loading, error, run } = useAsync<PendingPayment[]>(fetchPayments);

  const filtered = (payments ?? []).filter((p) => {
    if (activeTab === 'job') return p.paymentSource === 'JOB_PAYMENT';
    if (activeTab === 'subscription') return p.paymentSource === 'SUBSCRIPTION_PAYMENT';
    if (activeTab === 'wallet') return p.paymentSource === 'WALLET_TOPUP';
    return true;
  });

  const handleVerify = async (p: PendingPayment) => {
    const id = rowId(p);
    setActionId(id);
    try {
      await pendingPaymentsApi.verify(p);
      let label: string;
      if (p.paymentSource === 'SUBSCRIPTION_PAYMENT') {
        label = 'subscription';
      } else if (p.paymentSource === 'WALLET_TOPUP') {
        label = 'wallet top-up';
      } else {
        label = `job ${id.slice(0, 8)}`;
      }
      setFeedback(`Payment verified for ${label}`);
      run();
    } catch (e: unknown) {
      setFeedback((e as Error).message ?? 'Error verifying payment');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectItem) return;
    const id = rowId(rejectItem);
    setActionId(id);
    try {
      await pendingPaymentsApi.reject(rejectItem, rejectReason || 'Rejected by admin');
      let label: string;
      if (rejectItem.paymentSource === 'SUBSCRIPTION_PAYMENT') {
        label = 'subscription';
      } else if (rejectItem.paymentSource === 'WALLET_TOPUP') {
        label = 'wallet top-up';
      } else {
        label = `job ${id.slice(0, 8)}`;
      }
      setFeedback(`Payment rejected for ${label}`);
      setRejectItem(null);
      setRejectReason('');
      run();
    } catch (e: unknown) {
      setFeedback((e as Error).message ?? 'Error rejecting payment');
    } finally {
      setActionId(null);
    }
  };

  const tabCounts = {
    all: (payments ?? []).length,
    job: (payments ?? []).filter((p) => p.paymentSource === 'JOB_PAYMENT').length,
    subscription: (payments ?? []).filter((p) => p.paymentSource === 'SUBSCRIPTION_PAYMENT').length,
    wallet: (payments ?? []).filter((p) => p.paymentSource === 'WALLET_TOPUP').length,
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
        description="Review manual payment submissions from households before processing payouts."
        steps={[
          "Review the payment type (Job Payment, Subscription Payment, or Wallet Top-Up)",
          "Check the payment mode (Manual Provider or Integrated)",
          "Check the payment proof image for validity",
          "Verify the amount matches the job, subscription price, or top-up amount",
          "Click Verify to approve or Reject to decline with a reason",
        ]}
        tips={[
          "Subscription payments must be verified before the subscription becomes active",
          "Wallet top-ups credit the user's wallet after verification",
          "Manual Provider payments need confirmation from the payment provider",
          "Always verify the proof image before approving",
        ]}
      />

      {feedback && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {feedback}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border bg-gray-50 p-1">
        {(['all', 'job', 'subscription', 'wallet'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'all' ? 'All' : tab === 'job' ? 'Job Payments' : tab === 'subscription' ? 'Subscription Payments' : 'Wallet Top-Ups'}
            {' '}
            <span className="ml-1 rounded-full bg-gray-200 px-1.5 text-xs">
              {tabCounts[tab]}
            </span>
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Household</th>
                <th className="px-4 py-3">Date / Plan</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Method / Ref</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    No pending payments.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const id = rowId(p);
                const isSubscription = p.paymentSource === 'SUBSCRIPTION_PAYMENT';
                const isWalletTopUp = p.paymentSource === 'WALLET_TOPUP';
                return (
                  <tr key={rowKey(p)} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        isSubscription
                          ? 'bg-purple-100 text-purple-700'
                          : isWalletTopUp
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isSubscription ? 'Subscription' : isWalletTopUp ? 'Wallet Top-Up' : 'Job'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {id?.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {p.householdName ?? p.householdId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {isSubscription && p.planName
                        ? <span className="font-medium text-purple-700">{p.planName}</span>
                        : isWalletTopUp
                          ? <span className="font-medium text-green-700">Wallet Top-Up</span>
                          : p.scheduledDate}
                    </td>
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
                          onClick={() => handleVerify(p)}
                          disabled={actionId === id}
                          title="Verify payment"
                          className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-40"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => { setRejectItem(p); setRejectReason(''); }}
                          disabled={actionId === id}
                          title="Reject payment"
                          className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-40"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-bold text-gray-900">Reject Payment</h2>
            <p className="mb-3 text-sm text-gray-500">
              {rejectItem.paymentSource === 'SUBSCRIPTION_PAYMENT'
                ? <>Subscription <span className="font-medium text-purple-700">{rejectItem.planName}</span></>
                : rejectItem.paymentSource === 'WALLET_TOPUP'
                  ? <>Wallet Top-Up <span className="font-medium text-green-700">{rejectItem.quotedPrice?.toLocaleString()} XAF</span></>
                  : <>Job <span className="font-mono">{rejectItem.jobId?.slice(0, 8)}</span></>
              }
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
                onClick={() => setRejectItem(null)}
                className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionId === rowId(rejectItem)}
                className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionId === rowId(rejectItem) ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
