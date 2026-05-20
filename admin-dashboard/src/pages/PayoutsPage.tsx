import { useState, useCallback } from 'react';
import { payoutsApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import Pagination from '../components/Pagination';
import HelpGuide from '../components/HelpGuide';
import type { PayoutRequest, PayoutListResponse } from '../types';
import { CheckCircle, XCircle, DollarSign } from 'lucide-react';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'];

function statusStyle(status: string) {
  switch (status) {
    case 'PAID':     return 'bg-green-100 text-green-700';
    case 'APPROVED': return 'bg-blue-100 text-blue-700';
    case 'REJECTED': return 'bg-red-100 text-red-700';
    default:         return 'bg-yellow-100 text-yellow-700';
  }
}

export default function PayoutsPage() {
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [collectorId, setCollectorId] = useState('');
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');

  const fetchPayouts = useCallback(
    () => payoutsApi.list({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(collectorId ? { collectorId } : {}),
      page,
      limit: 20,
    }),
    [statusFilter, collectorId, page],
  );

  const { data, loading, error, run } = useAsync<PayoutListResponse>(fetchPayouts);
  const { data: config } = useAsync(payoutsApi.getConfig);

  const handleAction = async (
    payout: PayoutRequest,
    action: 'approve' | 'reject' | 'mark_paid',
  ) => {
    setActionId(payout.id);
    try {
      await payoutsApi.review(payout.id, action, noteMap[payout.id]);
      setFeedback(`Payout ${payout.id.slice(0, 8)}… → ${action.replace('_', ' ').toUpperCase()}`);
      run();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action failed';
      setFeedback(`Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setActionId(null);
    }
  };

  const totalPages = data?.meta.pages ?? 1;
  const pendingCount = data?.data.filter((p) => p.status === 'PENDING').length ?? 0;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payout Requests</h1>
          {config && (
            <p className="mt-0.5 text-xs text-gray-500">
              Limits: {config.minWithdrawal.toLocaleString()} – {config.maxWithdrawal.toLocaleString()} XAF
              &nbsp;·&nbsp; Methods: {config.methods.map((m) => m.label).join(', ')}
            </p>
          )}
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
            {pendingCount} pending
          </span>
        )}
      </div>

      <HelpGuide
        title="How to Manage Payout Requests"
        description="Review and process collector payout requests for their earnings."
        steps={[
          "Filter payouts by status (Pending, Approved, Rejected, Paid)",
          "Filter by collector ID to view specific collector requests",
          "Approve pending payout requests after verification",
          "Reject invalid payout requests with a reason",
          "Mark approved payouts as Paid after processing payment",
          "Add optional notes for each action",
        ]}
        tips={[
          "Payout limits and methods are configured in the Config page",
          "Always verify withdrawal details before approving",
          "Mark as Paid only after actual payment is processed",
        ]}
      />

      {feedback && (
        <div className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
          {feedback}
          <button onClick={() => setFeedback('')} className="ml-2 text-blue-500 underline">dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="text"
          placeholder="Collector ID"
          value={collectorId}
          onChange={(e) => { setCollectorId(e.target.value); setPage(1); }}
          className="w-64 rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={run} />}

      {!loading && !error && data && (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Collector</th>
                  <th className="px-4 py-3">Amount (XAF)</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Admin Note</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                      No payout requests found.
                    </td>
                  </tr>
                )}
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.collectorName ?? '—'}</p>
                      <p className="text-xs text-gray-400">{p.collectorPhone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.method.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.accountName && <p className="font-medium">{p.accountName}</p>}
                      {p.accountNumber && <p>{p.accountNumber}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Optional note…"
                        value={noteMap[p.id] ?? ''}
                        onChange={(e) => setNoteMap((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-36 rounded border border-gray-200 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleAction(p, 'approve')}
                              disabled={actionId === p.id}
                              className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              <CheckCircle size={11} /> Approve
                            </button>
                            <button
                              onClick={() => handleAction(p, 'reject')}
                              disabled={actionId === p.id}
                              className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle size={11} /> Reject
                            </button>
                          </>
                        )}
                        {p.status === 'APPROVED' && (
                          <button
                            onClick={() => handleAction(p, 'mark_paid')}
                            disabled={actionId === p.id}
                            className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            <DollarSign size={11} />
                            {actionId === p.id ? 'Processing…' : 'Mark Paid'}
                          </button>
                        )}
                        {(p.status === 'PAID' || p.status === 'REJECTED') && (
                          <span className="text-xs text-gray-400">
                            {p.status === 'PAID' ? `Paid ${p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ''}` : 'Rejected'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <div className="mt-8 rounded-lg border bg-yellow-50 p-4 text-sm text-yellow-800">
        <strong>Payout config</strong> — min/max amounts and enabled methods are managed in the{' '}
        <a href="/config" className="font-medium underline">Config page</a>{' '}
        under the <code className="rounded bg-yellow-100 px-1">payout</code> category.
      </div>
    </div>
  );
}
