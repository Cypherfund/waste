import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Banknote } from 'lucide-react';
import { MarketerPayoutRequest, MarketerPayoutsResponse } from '../types';
import { growthPayoutsApi } from '../services/api/growth';
import Pagination from '../components/Pagination';
import HelpGuide from '../components/HelpGuide';
import { usePagination } from '../hooks/usePagination';
import { useAlert } from '../contexts/AlertContext';

const PAGE_SIZE = 20;

export default function MarketerPayoutsPage() {
  const [payouts, setPayouts] = useState<MarketerPayoutRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const { page, setPage, resetPage } = usePagination();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [payId, setPayId] = useState<string | null>(null);
  const { showSuccess, showError } = useAlert();
  const [payRef, setPayRef] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const res = await growthPayoutsApi.list(params);
      setPayouts(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { resetPage(); }, [statusFilter]);
  useEffect(() => { load(); }, [statusFilter, page]);

  const handleApprove = async (id: string) => {
    try {
      await growthPayoutsApi.approve(id);
      showSuccess('Payout approved');
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error approving payout');
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason) return;
    try {
      await growthPayoutsApi.reject(rejectId, rejectReason);
      setRejectId(null);
      setRejectReason('');
      showSuccess('Payout rejected');
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error rejecting payout');
    }
  };

  const handleMarkPaid = async () => {
    if (!payId || !payRef) return;
    try {
      await growthPayoutsApi.markPaid(payId, payRef);
      setPayId(null);
      setPayRef('');
      showSuccess('Payout marked as paid');
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error marking payout as paid');
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      REJECTED: 'bg-red-100 text-red-700',
      PAID: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketer Payouts</h1>
        <p className="text-sm text-gray-500">Review and process marketer payout requests</p>
      </div>

      <HelpGuide
        title="How to Process Marketer Payouts"
        description="Review and approve payout requests from marketers for their earned commissions."
        steps={[
          "Filter payouts by status (Pending, Approved, Rejected, Paid)",
          "Review payout details: amount, method, and account information",
          "Approve pending payout requests",
          "Mark approved payouts as Paid with payment reference",
          "Reject invalid payout requests with a reason",
        ]}
        tips={[
          "Always verify account details before approving",
          "Enter payment reference/transaction ID when marking as Paid",
          "Rejected payouts notify the marketer with the reason",
        ]}
      />

      {/* Status Filter */}
      <div className="mb-4 flex gap-2">
        {['', 'PENDING', 'APPROVED', 'REJECTED', 'PAID'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s || 'All'} {s === '' && `(${total})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : payouts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No payout requests found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Marketer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium text-gray-900">{p.marketerProfile?.user?.name || '—'}</div>
                    {p.marketerProfile?.user?.phone && <div className="text-gray-400">{p.marketerProfile.user.phone}</div>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{Number(p.amount).toLocaleString()} XAF</td>
                  <td className="px-4 py-3 text-gray-600">{p.method}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{p.accountNumber}</div>
                    {p.accountName && <div className="text-xs text-gray-400">{p.accountName}</div>}
                  </td>
                  <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {p.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleApprove(p.id)} className="rounded p-1.5 text-green-600 hover:bg-green-50" title="Approve">
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => setRejectId(p.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Reject">
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      {p.status === 'APPROVED' && (
                        <button onClick={() => setPayId(p.id)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50" title="Mark as Paid">
                          <Banknote size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold">Reject Payout</h3>
            <textarea
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Reason for rejection *"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {payId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold">Mark as Paid</h3>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Payment reference / transaction ID *"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setPayId(null); setPayRef(''); }} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleMarkPaid} disabled={!payRef} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Confirm Paid</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
