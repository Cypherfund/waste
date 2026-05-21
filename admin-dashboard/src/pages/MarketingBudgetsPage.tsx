import { useEffect, useState } from 'react';
import { Plus, X, TrendingUp, Wallet, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { MarketingBudgetPeriod, BudgetTransaction, Marketer } from '../types';
import { growthBudgetsApi, growthMarketersApi } from '../services/api/growth';
import HelpGuide from '../components/HelpGuide';

export default function MarketingBudgetsPage() {
  const [budgets, setBudgets] = useState<MarketingBudgetPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<MarketingBudgetPeriod | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  
  const [form, setForm] = useState({
    name: '',
    totalBudget: '',
    startDate: '',
    endDate: '',
  });

  const [updateForm, setUpdateForm] = useState({
    totalBudget: '',
    adjustmentReason: '',
  });

  const [showUpdate, setShowUpdate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await growthBudgetsApi.list();
      setBudgets(data);
      const marketerData = await growthMarketersApi.list();
      setMarketers(marketerData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (budgetId: string) => {
    try {
      const data = await growthBudgetsApi.getTransactions(budgetId);
      setTransactions(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await growthBudgetsApi.create({
        name: form.name,
        totalBudget: Number(form.totalBudget),
        startDate: form.startDate,
        endDate: form.endDate,
      });
      setShowCreate(false);
      setForm({ name: '', totalBudget: '', startDate: '', endDate: '' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating budget period');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudget) return;
    try {
      await growthBudgetsApi.update(selectedBudget.id, {
        totalBudget: Number(updateForm.totalBudget),
        adjustmentReason: updateForm.adjustmentReason,
      });
      setShowUpdate(false);
      setUpdateForm({ totalBudget: '', adjustmentReason: '' });
      setSelectedBudget(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating budget period');
    }
  };

  const handleClose = async (budget: MarketingBudgetPeriod) => {
    if (!confirm(`Close budget period "${budget.name}"?`)) return;
    try {
      await growthBudgetsApi.close(budget.id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error closing budget period');
    }
  };

  const handleViewTransactions = (budget: MarketingBudgetPeriod) => {
    setSelectedBudget(budget);
    setShowTransactions(true);
    loadTransactions(budget.id);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      CLOSED: 'bg-gray-100 text-gray-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const transactionTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      COMMITTED: 'bg-blue-100 text-blue-700',
      RELEASED: 'bg-yellow-100 text-yellow-700',
      SPENT: 'bg-green-100 text-green-700',
      ADJUSTMENT: 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {type}
      </span>
    );
  };

  const getBudgetAlert = (budget: MarketingBudgetPeriod) => {
    const remaining = budget.totalBudget - budget.committedAmount - budget.spentAmount;
    const usagePct = ((budget.committedAmount + budget.spentAmount) / budget.totalBudget) * 100;
    
    if (usagePct >= 100) return { color: 'text-red-600', icon: <XCircle size={16} />, message: 'Exhausted' };
    if (usagePct >= 80) return { color: 'text-orange-600', icon: <AlertTriangle size={16} />, message: 'Low' };
    if (usagePct >= 50) return { color: 'text-yellow-600', icon: <AlertTriangle size={16} />, message: 'Warning' };
    return { color: 'text-green-600', icon: <CheckCircle size={16} />, message: 'Healthy' };
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Budget Periods</h1>
          <p className="text-sm text-gray-500">Manage overall marketing budget allocations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus size={16} /> Create Budget Period
        </button>
      </div>

      <HelpGuide
        title="How to Manage Marketing Budgets"
        description="Create and manage overall budget periods for marketing campaigns. Budgets are enforced during commission approvals."
        steps={[
          "Click 'Create Budget Period' to add a new budget period",
          "Set the total budget amount and date range",
          "Create campaigns within budget periods to allocate specific budgets",
          "Monitor budget usage through the transactions view",
          "Close budget periods when the period ends",
        ]}
        tips={[
          "Budget periods enforce limits on commission approvals",
          "Campaigns must have sufficient budget before commissions can be approved",
          "Budget transactions provide an audit trail of all changes",
          "Closing a budget period blocks new commission approvals",
        ]}
      />

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Create Budget Period</h2>
            <div className="space-y-3">
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Budget Period Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                type="number"
                placeholder="Total Budget (XAF) *"
                value={form.totalBudget}
                onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                required
              />
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                type="date"
                placeholder="Start Date *"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                type="date"
                placeholder="End Date *"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Update Modal */}
      {showUpdate && selectedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form onSubmit={handleUpdate} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Update Budget</h2>
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Current Budget</p>
                <p className="text-lg font-semibold">{selectedBudget.totalBudget.toLocaleString()} XAF</p>
              </div>
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                type="number"
                placeholder="New Total Budget (XAF)"
                value={updateForm.totalBudget}
                onChange={(e) => setUpdateForm({ ...updateForm, totalBudget: e.target.value })}
              />
              <textarea
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Adjustment Reason (required if changing budget)"
                value={updateForm.adjustmentReason}
                onChange={(e) => setUpdateForm({ ...updateForm, adjustmentReason: e.target.value })}
                rows={3}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowUpdate(false); setSelectedBudget(null); setUpdateForm({ totalBudget: '', adjustmentReason: '' }); }} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Update</button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions Modal */}
      {showTransactions && selectedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Budget Transactions - {selectedBudget.name}</h2>
              <button onClick={() => { setShowTransactions(false); setSelectedBudget(null); setTransactions([]); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total Budget</p>
                  <p className="font-semibold">{selectedBudget.totalBudget.toLocaleString()} XAF</p>
                </div>
                <div>
                  <p className="text-gray-500">Committed</p>
                  <p className="font-semibold text-blue-600">{selectedBudget.committedAmount.toLocaleString()} XAF</p>
                </div>
                <div>
                  <p className="text-gray-500">Spent</p>
                  <p className="font-semibold text-green-600">{selectedBudget.spentAmount.toLocaleString()} XAF</p>
                </div>
                <div>
                  <p className="text-gray-500">Remaining</p>
                  <p className="font-semibold">{(selectedBudget.totalBudget - selectedBudget.committedAmount - selectedBudget.spentAmount).toLocaleString()} XAF</p>
                </div>
              </div>
            </div>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No transactions yet</p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Balance Before</th>
                      <th className="px-4 py-3">Balance After</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{transactionTypeBadge(t.type)}</td>
                        <td className="px-4 py-3 font-medium">{t.amount.toLocaleString()} XAF</td>
                        <td className="px-4 py-3 text-gray-600">{t.balanceBefore.toLocaleString()} XAF</td>
                        <td className="px-4 py-3 text-gray-600">{t.balanceAfter.toLocaleString()} XAF</td>
                        <td className="px-4 py-3 text-gray-600">{t.description || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : budgets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No budget periods yet. Create your first budget period!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Total Budget</th>
                <th className="px-4 py-3 text-right">Committed</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Alert</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {budgets.map((b) => {
                const remaining = b.totalBudget - b.committedAmount - b.spentAmount;
                const alert = getBudgetAlert(b);
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {b.totalBudget.toLocaleString()} XAF
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600">
                      {b.committedAmount.toLocaleString()} XAF
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {b.spentAmount.toLocaleString()} XAF
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {remaining.toLocaleString()} XAF
                    </td>
                    <td className="px-4 py-3">{statusBadge(b.status)}</td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1 ${alert.color}`}>
                        {alert.icon}
                        <span className="text-xs">{alert.message}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewTransactions(b)}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                          title="View Transactions"
                        >
                          <TrendingUp size={16} />
                        </button>
                        {b.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => { setSelectedBudget(b); setShowUpdate(true); setUpdateForm({ totalBudget: b.totalBudget.toString(), adjustmentReason: '' }); }}
                              className="rounded p-1.5 text-blue-500 hover:bg-blue-50"
                              title="Update Budget"
                            >
                              <Wallet size={16} />
                            </button>
                            <button
                              onClick={() => handleClose(b)}
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                              title="Close Budget"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
