import { useState, useCallback } from 'react';
import { earningsApi, statsApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import Pagination from '../components/Pagination';
import HelpGuide from '../components/HelpGuide';
import type { Earning, EarningsListResponse } from '../types';
import { DollarSign, Download, CheckCircle, Zap, Info } from 'lucide-react';

const STATUSES = ['PENDING', 'CONFIRMED', 'PAID'];

function statusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-700';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}

export default function EarningsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [collectorId, setCollectorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats } = useAsync(statsApi.get);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const fetchEarnings = useCallback(
    () =>
      earningsApi.list({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(collectorId ? { collectorId } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        page,
        limit: 20,
      }),
    [statusFilter, collectorId, from, to, page],
  );

  const { data, loading, error, run } = useAsync<EarningsListResponse>(fetchEarnings);

  const handleMarkPaid = async (earning: Earning) => {
    setPayingId(earning.id);
    try {
      await earningsApi.markAsPaid(earning.id);
      setFeedback(`Earning for job ${earning.jobId.slice(0, 8)}... marked as PAID.`);
      run();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to mark as paid';
      setFeedback(`Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setPayingId(null);
    }
  };

  const handleExport = () => {
    const url = earningsApi.exportCsvUrl({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(collectorId ? { collectorId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
    window.open(url, '_blank');
  };

  const totalPages = data?.meta.pages ?? 1;

  const totalAmount = data?.data.reduce((sum, e) => sum + e.totalAmount, 0) ?? 0;
  const confirmedAmount = data?.data
    .filter((e) => e.status === 'CONFIRMED' || e.status === 'PAID')
    .reduce((sum, e) => sum + e.totalAmount, 0) ?? 0;

  return (
    <div>
      {stats && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
            stats.paymentIntegrationEnabled
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-yellow-200 bg-yellow-50 text-yellow-800'
          }`}
        >
          {stats.paymentIntegrationEnabled ? (
            <Zap size={15} className="shrink-0" />
          ) : (
            <Info size={15} className="shrink-0" />
          )}
          <span>
            <strong>Payout mode:</strong>{' '}
            {stats.paymentIntegrationEnabled
              ? 'Payment integration active — payouts are processed automatically.'
              : 'Manual payouts — mark CONFIRMED earnings as PAID after processing via mobile money or bank transfer.'}
          </span>
        </div>
      )}

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h1>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      <HelpGuide
        title="How to Manage Earnings & Payouts"
        description="Track collector earnings from completed jobs and manage payout requests."
        steps={[
          "Filter earnings by status (Pending, Confirmed, Paid)",
          "Filter by collector ID to view specific collector earnings",
          "Filter by date range to find earnings within a period",
          "View summary cards for on-page totals and confirmed amounts",
          "Mark Confirmed earnings as Paid after processing",
          "Export earnings data to CSV for accounting",
        ]}
        tips={[
          "Pending earnings need to be Confirmed before they can be Paid",
          "Use Export CSV for external accounting and reporting",
          "Payment integration mode processes payouts automatically",
        ]}
      />

      {/* Summary Cards */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-yellow-50 p-2.5">
            <DollarSign size={20} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">On page total</p>
            <p className="text-lg font-bold text-gray-900">
              {totalAmount.toLocaleString()} XAF
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-blue-50 p-2.5">
            <CheckCircle size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Confirmed/Paid</p>
            <p className="text-lg font-bold text-gray-900">
              {confirmedAmount.toLocaleString()} XAF
            </p>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs text-gray-500">Total records</p>
            <p className="text-lg font-bold text-gray-900">{data?.meta.total ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Collector ID"
          value={collectorId}
          onChange={(e) => { setCollectorId(e.target.value); setPage(1); }}
          className="w-64 rounded border border-gray-300 px-3 py-1.5 text-sm"
        />

        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
        <span className="self-center text-xs text-gray-400">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
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

      {!loading && !error && data && (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Collector</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Base</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">Surge</th>
                  <th className="px-4 py-3">Total (XAF)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Confirmed</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                      No earnings found.
                    </td>
                  </tr>
                )}
                {data.data.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{e.collectorName ?? '—'}</p>
                      <p className="text-xs text-gray-400">{e.collectorPhone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {e.jobId.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-gray-700">{e.baseAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{e.distanceAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{e.surgeMultiplier}x</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {e.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(e.status)}`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {e.confirmedAt ? new Date(e.confirmedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {e.paidAt ? new Date(e.paidAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {e.status === 'CONFIRMED' ? (
                        <button
                          onClick={() => handleMarkPaid(e)}
                          disabled={payingId === e.id}
                          className="inline-flex items-center gap-1 rounded bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          <DollarSign size={12} />
                          {payingId === e.id ? 'Processing...' : 'Mark Paid'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {e.status === 'PAID' ? 'Paid ✓' : 'Awaiting confirmation'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
