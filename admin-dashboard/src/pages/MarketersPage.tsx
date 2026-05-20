import { useEffect, useState } from 'react';
import { UserPlus, Ban, CheckCircle, Copy } from 'lucide-react';
import { Marketer } from '../types';
import { growthMarketersApi } from '../services/api/growth';
import HelpGuide from '../components/HelpGuide';

export default function MarketersPage() {
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', territory: '' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await growthMarketersApi.list();
      setMarketers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await growthMarketersApi.create(form);
      setShowCreate(false);
      setForm({ name: '', phone: '', email: '', territory: '' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating marketer');
    }
  };

  const handleToggleStatus = async (m: Marketer) => {
    try {
      if (m.status === 'ACTIVE') {
        await growthMarketersApi.suspend(m.id);
      } else {
        await growthMarketersApi.activate(m.id);
      }
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      SUSPENDED: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketers / Ambassadors</h1>
          <p className="text-sm text-gray-500">Manage growth team members</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <UserPlus size={16} /> Add Marketer
        </button>
      </div>

      <HelpGuide
        title="How to Manage Marketers"
        description="Create and manage marketer/ambassador accounts who generate leads and earn commissions."
        steps={[
          "Click 'Add Marketer' to create a new marketer account",
          "Enter name, phone, email, and territory for the marketer",
          "View marketer stats: leads, registrations, qualifications, earnings",
          "Suspend or activate marketers as needed",
          "Copy referral codes for sharing with marketers",
        ]}
        tips={[
          "Marketers earn commissions when leads convert to registered users",
          "Suspended marketers cannot submit new leads",
          "Each marketer has a unique referral code for tracking",
        ]}
      />

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Create Marketer</h2>
            <div className="space-y-3">
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Full Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Phone (e.g. +237690000000) *"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Email (optional)"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Territory (optional)"
                value={form.territory}
                onChange={(e) => setForm({ ...form, territory: e.target.value })}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : marketers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No marketers yet. Add your first ambassador!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Referral Code</th>
                <th className="px-4 py-3">Territory</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Leads</th>
                <th className="px-4 py-3 text-center">Registered</th>
                <th className="px-4 py-3 text-center">Qualified</th>
                <th className="px-4 py-3 text-right">Earned</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {marketers.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-3 text-gray-600">{m.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{m.referralCode}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(m.referralCode)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.territory || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(m.status)}</td>
                  <td className="px-4 py-3 text-center">{m.totalLeads}</td>
                  <td className="px-4 py-3 text-center">{m.totalRegistered}</td>
                  <td className="px-4 py-3 text-center">{m.totalQualified}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {Number(m.totalEarned).toLocaleString()} XAF
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleStatus(m)}
                      className={`rounded p-1.5 ${m.status === 'ACTIVE' ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                      title={m.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    >
                      {m.status === 'ACTIVE' ? <Ban size={16} /> : <CheckCircle size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
