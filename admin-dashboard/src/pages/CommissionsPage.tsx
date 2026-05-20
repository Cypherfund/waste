import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Plus, Pencil, Power } from 'lucide-react';
import { CommissionScheme, CommissionTransaction } from '../types';
import { growthSchemesApi, growthCommissionsApi } from '../services/api/growth';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';

const PAGE_SIZE = 20;

export default function CommissionsPage() {
  const [tab, setTab] = useState<'transactions' | 'schemes'>('transactions');
  const [schemes, setSchemes] = useState<CommissionScheme[]>([]);
  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const { page, setPage, resetPage } = usePagination();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showCreateScheme, setShowCreateScheme] = useState(false);
  const [schemeForm, setSchemeForm] = useState({ name: '', type: 'HOUSEHOLD_ONBOARDING', description: '', commissionType: 'FIXED', amount: '' });
  const [editingScheme, setEditingScheme] = useState<CommissionScheme | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const loadSchemes = async () => {
    try { setSchemes(await growthSchemesApi.list()); } catch (e) { console.error(e); }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const res = await growthCommissionsApi.list(params);
      setTransactions(res.data);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSchemes(); }, []);
  useEffect(() => { resetPage(); }, [statusFilter]);
  useEffect(() => { loadTransactions(); }, [statusFilter, page]);

  const handleApprove = async (id: string) => {
    try {
      await growthCommissionsApi.approve(id);
      loadTransactions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason) return;
    try {
      await growthCommissionsApi.reject(rejectId, rejectReason);
      setRejectId(null);
      setRejectReason('');
      loadTransactions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await growthSchemesApi.create({ ...schemeForm, amount: Number(schemeForm.amount) });
      setShowCreateScheme(false);
      setSchemeForm({ name: '', type: 'HOUSEHOLD_ONBOARDING', description: '', commissionType: 'FIXED', amount: '' });
      loadSchemes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating scheme');
    }
  };

  const handleUpdateAmount = async () => {
    if (!editingScheme || !editAmount) return;
    try {
      await growthSchemesApi.update(editingScheme.id, { amount: Number(editAmount) } as any);
      setEditingScheme(null);
      setEditAmount('');
      loadSchemes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating scheme');
    }
  };

  const handleDeactivateScheme = async (id: string) => {
    if (!confirm('Deactivate this commission scheme?')) return;
    try {
      await growthSchemesApi.deactivate(id);
      loadSchemes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deactivating scheme');
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      PAID: 'bg-blue-100 text-blue-700',
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
        <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
        <p className="text-sm text-gray-500">Manage commission schemes and transactions</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex border-b">
        <button
          onClick={() => setTab('transactions')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'transactions' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Transactions ({total})
        </button>
        <button
          onClick={() => setTab('schemes')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'schemes' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Schemes ({schemes.length})
        </button>
      </div>

      {tab === 'schemes' && (
        <>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setShowCreateScheme(true)} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              <Plus size={16} /> New Scheme
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {schemes.map((s) => (
              <div key={s.id} className={`rounded-lg border bg-white p-4 shadow-sm ${!s.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{s.description}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {s.commissionType === 'FIXED' ? `${Number(s.amount).toLocaleString()} XAF` : `${s.amount}%`}
                  </span>
                  <span className="text-xs text-gray-400">
                    {s.commissionType === 'PERCENTAGE' ? 'of transaction' : 'per event'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Type: {s.type.replace(/_/g, ' ')}
                </div>
                <div className="mt-3 flex gap-1 border-t pt-3">
                  <button onClick={() => { setEditingScheme(s); setEditAmount(String(s.amount)); }} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50" title="Edit amount">
                    <Pencil size={12} /> Edit
                  </button>
                  {s.isActive && (
                    <button onClick={() => handleDeactivateScheme(s.id)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50" title="Deactivate">
                      <Power size={12} /> Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'transactions' && (
        <>
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
                {s || 'All'}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : transactions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500">No commission transactions found.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2 text-xs text-gray-500">
                <span>{total} transaction{total !== 1 ? 's' : ''}</span>
                <span>Page {page} of {Math.ceil(total / PAGE_SIZE) || 1}</span>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Marketer</th>
                    <th className="px-4 py-3">Trigger</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 text-xs">
                        <div>{t.marketerProfile?.user?.name || '—'}</div>
                        {t.marketerProfile?.user?.phone && <div className="text-gray-400">{t.marketerProfile.user.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{t.triggerType.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 font-medium">{Number(t.amount).toLocaleString()} XAF</td>
                      <td className="px-4 py-3">{statusBadge(t.status)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{t.description || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {t.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApprove(t.id)}
                              className="rounded p-1.5 text-green-600 hover:bg-green-50"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => setRejectId(t.id)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={page}
                totalPages={Math.ceil(total / PAGE_SIZE)}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold">Reject Commission</h3>
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

      {/* Create Scheme Modal */}
      {showCreateScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form onSubmit={handleCreateScheme} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Create Commission Scheme</h2>
            <div className="space-y-3">
              <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Scheme Name *" value={schemeForm.name} onChange={(e) => setSchemeForm({ ...schemeForm, name: e.target.value })} required />
              <select className="w-full rounded border px-3 py-2 text-sm" value={schemeForm.type} onChange={(e) => setSchemeForm({ ...schemeForm, type: e.target.value })}>
                <option value="HOUSEHOLD_ONBOARDING">Household Onboarding</option>
                <option value="COLLECTOR_ONBOARDING">Collector Onboarding</option>
                <option value="SUBSCRIPTION_PAYMENT">Subscription Payment</option>
              </select>
              <select className="w-full rounded border px-3 py-2 text-sm" value={schemeForm.commissionType} onChange={(e) => setSchemeForm({ ...schemeForm, commissionType: e.target.value })}>
                <option value="FIXED">Fixed Amount (XAF)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
              <input className="w-full rounded border px-3 py-2 text-sm" type="number" step="any" placeholder={schemeForm.commissionType === 'FIXED' ? 'Amount (XAF) *' : 'Percentage *'} value={schemeForm.amount} onChange={(e) => setSchemeForm({ ...schemeForm, amount: e.target.value })} required />
              <textarea className="w-full rounded border px-3 py-2 text-sm" placeholder="Description (optional)" rows={2} value={schemeForm.description} onChange={(e) => setSchemeForm({ ...schemeForm, description: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateScheme(false)} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Amount Modal */}
      {editingScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold">Edit Commission Amount</h3>
            <p className="mb-4 text-sm text-gray-500">{editingScheme.name}</p>
            <input className="w-full rounded border px-3 py-2 text-sm" type="number" step="any" placeholder={editingScheme.commissionType === 'FIXED' ? 'Amount (XAF)' : 'Percentage'} value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setEditingScheme(null); setEditAmount(''); }} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleUpdateAmount} disabled={!editAmount} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
