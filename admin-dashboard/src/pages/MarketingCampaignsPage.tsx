import { useEffect, useState } from 'react';
import { Plus, X, Users, Target, Play, Pause, Square, Ban, Settings } from 'lucide-react';
import { MarketingCampaign, MarketingBudgetPeriod, Marketer, CommissionScheme } from '../types';
import { growthCampaignsApi, growthBudgetsApi, growthMarketersApi, growthSchemesApi } from '../services/api/growth';
import HelpGuide from '../components/HelpGuide';

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssignMarketers, setShowAssignMarketers] = useState(false);
  const [showAssignSchemes, setShowAssignSchemes] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [budgetPeriods, setBudgetPeriods] = useState<MarketingBudgetPeriod[]>([]);
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [schemes, setSchemes] = useState<CommissionScheme[]>([]);
  
  const [form, setForm] = useState({
    budgetPeriodId: '',
    name: '',
    description: '',
    territory: '',
    startDate: '',
    endDate: '',
    budgetAmount: '',
  });

  const [assignMarketersForm, setAssignMarketersForm] = useState({
    marketerProfileIds: [] as string[],
  });

  const [assignSchemesForm, setAssignSchemesForm] = useState({
    schemeIds: [] as string[],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [campaignsResponse, budgetPeriodsResponse, marketersData, schemesData] = await Promise.all([
        growthCampaignsApi.list({ page, limit }),
        growthBudgetsApi.list({ page: 1, limit: 100 }),
        growthMarketersApi.list(),
        growthSchemesApi.list(),
      ]);
      setCampaigns(campaignsResponse.data);
      setTotal(campaignsResponse.total);
      setBudgetPeriods(budgetPeriodsResponse.data);
      setMarketers(marketersData);
      setSchemes(schemesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await growthCampaignsApi.create({
        budgetPeriodId: form.budgetPeriodId,
        name: form.name,
        description: form.description,
        territory: form.territory,
        startDate: form.startDate,
        endDate: form.endDate,
        budgetAmount: Number(form.budgetAmount),
      });
      setShowCreate(false);
      setForm({
        budgetPeriodId: '',
        name: '',
        description: '',
        territory: '',
        startDate: '',
        endDate: '',
        budgetAmount: '',
      });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating campaign');
    }
  };

  const handleActivate = async (campaign: MarketingCampaign) => {
    try {
      await growthCampaignsApi.activate(campaign.id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error activating campaign');
    }
  };

  const handlePause = async (campaign: MarketingCampaign) => {
    try {
      await growthCampaignsApi.pause(campaign.id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error pausing campaign');
    }
  };

  const handleEnd = async (campaign: MarketingCampaign) => {
    if (!confirm(`End campaign "${campaign.name}"?`)) return;
    try {
      await growthCampaignsApi.end(campaign.id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error ending campaign');
    }
  };

  const handleCancel = async (campaign: MarketingCampaign) => {
    if (!confirm(`Cancel campaign "${campaign.name}"?`)) return;
    try {
      await growthCampaignsApi.cancel(campaign.id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error cancelling campaign');
    }
  };

  const handleAssignMarketers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    try {
      await growthCampaignsApi.assignMarketers(selectedCampaign.id, assignMarketersForm);
      setShowAssignMarketers(false);
      setAssignMarketersForm({ marketerProfileIds: [] });
      setSelectedCampaign(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error assigning marketers');
    }
  };

  const handleAssignSchemes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    try {
      await growthCampaignsApi.assignSchemes(selectedCampaign.id, assignSchemesForm);
      setShowAssignSchemes(false);
      setAssignSchemesForm({ schemeIds: [] });
      setSelectedCampaign(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error assigning schemes');
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      PAUSED: 'bg-yellow-100 text-yellow-700',
      ENDED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const toggleMarketerSelection = (marketerId: string) => {
    if (assignMarketersForm.marketerProfileIds.includes(marketerId)) {
      setAssignMarketersForm({
        marketerProfileIds: assignMarketersForm.marketerProfileIds.filter((id) => id !== marketerId),
      });
    } else {
      setAssignMarketersForm({
        marketerProfileIds: [...assignMarketersForm.marketerProfileIds, marketerId],
      });
    }
  };

  const toggleSchemeSelection = (schemeId: string) => {
    if (assignSchemesForm.schemeIds.includes(schemeId)) {
      setAssignSchemesForm({
        schemeIds: assignSchemesForm.schemeIds.filter((id) => id !== schemeId),
      });
    } else {
      setAssignSchemesForm({
        schemeIds: [...assignSchemesForm.schemeIds, schemeId],
      });
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Campaigns</h1>
          <p className="text-sm text-gray-500">Manage marketing campaigns and assign marketers</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      <HelpGuide
        title="How to Manage Marketing Campaigns"
        description="Create and manage marketing campaigns within budget periods. Assign marketers and commission schemes to each campaign."
        steps={[
          "Click 'Create Campaign' to add a new marketing campaign",
          "Select a budget period and set campaign details",
          "Assign marketers to the campaign who can create leads",
          "Optionally restrict which commission schemes apply to this campaign",
          "Activate the campaign to start accepting leads",
          "Monitor budget usage and performance",
        ]}
        tips={[
          "Campaigns must be activated before marketers can create leads",
          "Campaign dates must fall within the selected budget period",
          "Marketers can only create leads for campaigns they're assigned to",
          "Budget is enforced at both campaign and budget period level",
        ]}
      />

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold">Create Campaign</h2>
            <div className="space-y-3">
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={form.budgetPeriodId}
                onChange={(e) => setForm({ ...form, budgetPeriodId: e.target.value })}
                required
              >
                <option value="">Select Budget Period *</option>
                {budgetPeriods.filter((bp) => bp.status === 'ACTIVE').map((bp) => (
                  <option key={bp.id} value={bp.id}>
                    {bp.name} ({bp.totalBudget.toLocaleString()} XAF)
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Campaign Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <textarea
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Territory (optional)"
                value={form.territory}
                onChange={(e) => setForm({ ...form, territory: e.target.value })}
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
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                type="number"
                placeholder="Budget Amount (XAF) *"
                value={form.budgetAmount}
                onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })}
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

      {/* Assign Marketers Modal */}
      {showAssignMarketers && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form onSubmit={handleAssignMarketers} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold">Assign Marketers to {selectedCampaign.name}</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {marketers.map((m) => (
                <label key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignMarketersForm.marketerProfileIds.includes(m.id)}
                    onChange={() => toggleMarketerSelection(m.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.phone} - {m.territory || 'No territory'}</p>
                  </div>
                  {statusBadge(m.status)}
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowAssignMarketers(false); setSelectedCampaign(null); setAssignMarketersForm({ marketerProfileIds: [] }); }} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Assign</button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Schemes Modal */}
      {showAssignSchemes && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form onSubmit={handleAssignSchemes} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold">Assign Commission Schemes to {selectedCampaign.name}</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {schemes.map((s) => (
                <label key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignSchemesForm.schemeIds.includes(s.id)}
                    onChange={() => toggleSchemeSelection(s.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.type} - {s.commissionType}: {s.amount}</p>
                  </div>
                  {s.isActive ? (
                    <span className="text-xs text-green-600">Active</span>
                  ) : (
                    <span className="text-xs text-gray-400">Inactive</span>
                  )}
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowAssignSchemes(false); setSelectedCampaign(null); setAssignSchemesForm({ schemeIds: [] }); }} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Assign</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No campaigns yet. Create your first campaign!</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Budget Period</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3 text-right">Budget</th>
                  <th className="px-4 py-3 text-right">Committed</th>
                  <th className="px-4 py-3 text-right">Spent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaigns.map((c) => {
                  const remaining = c.budgetAmount - c.committedAmount - c.spentAmount;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.budgetPeriod?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.territory || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {c.budgetAmount.toLocaleString()} XAF
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600">
                        {c.committedAmount.toLocaleString()} XAF
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {c.spentAmount.toLocaleString()} XAF
                      </td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setSelectedCampaign(c); setShowAssignMarketers(true); setAssignMarketersForm({ marketerProfileIds: c.marketerAssignments?.filter((a) => a.isActive).map((a) => a.marketerProfileId) || [] }); }}
                            className="rounded p-1.5 text-blue-500 hover:bg-blue-50"
                            title="Assign Marketers"
                          >
                            <Users size={16} />
                          </button>
                          <button
                            onClick={() => { setSelectedCampaign(c); setShowAssignSchemes(true); setAssignSchemesForm({ schemeIds: [] }); }}
                            className="rounded p-1.5 text-purple-500 hover:bg-purple-50"
                            title="Assign Schemes"
                          >
                            <Target size={16} />
                          </button>
                          {c.status === 'DRAFT' && (
                            <button
                              onClick={() => handleActivate(c)}
                              className="rounded p-1.5 text-green-500 hover:bg-green-50"
                              title="Activate"
                            >
                              <Play size={16} />
                            </button>
                          )}
                          {c.status === 'ACTIVE' && (
                            <button
                              onClick={() => handlePause(c)}
                              className="rounded p-1.5 text-yellow-500 hover:bg-yellow-50"
                              title="Pause"
                            >
                              <Pause size={16} />
                            </button>
                          )}
                          {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
                            <button
                              onClick={() => handleEnd(c)}
                              className="rounded p-1.5 text-blue-500 hover:bg-blue-50"
                              title="End"
                            >
                              <Square size={16} />
                            </button>
                          )}
                          {c.status !== 'ENDED' && c.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleCancel(c)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                              title="Cancel"
                            >
                              <Ban size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {total > limit && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} campaigns
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  Page {page} of {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                  disabled={page >= Math.ceil(total / limit)}
                  className="rounded px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
