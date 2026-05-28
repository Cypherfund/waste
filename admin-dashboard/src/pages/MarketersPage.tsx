import { useEffect, useState } from 'react';
import { UserPlus, Ban, CheckCircle, Copy, Check, Smartphone, Mail, MessageCircle } from 'lucide-react';
import { Marketer } from '../types';
import { growthMarketersApi } from '../services/api/growth';
import HelpGuide from '../components/HelpGuide';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { useAlert } from '../contexts/AlertContext';

const PAGE_SIZE = 20;

export default function MarketersPage() {
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', territory: '' });
  const [newMarketer, setNewMarketer] = useState<Marketer | null>(null);
  const { page, setPage } = usePagination();
  const { showSuccess, showError } = useAlert();

  const load = async () => {
    setLoading(true);
    try {
      const response = await growthMarketersApi.list({ page, limit: PAGE_SIZE });
      setMarketers(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (e) {
      showError('Failed to load marketers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await growthMarketersApi.create(form);
      setShowCreate(false);
      setForm({ name: '', phone: '', email: '', territory: '' });
      setNewMarketer(created);
      showSuccess('Marketer created successfully');
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error creating marketer');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (m: Marketer) => {
    try {
      if (m.status === 'ACTIVE') {
        await growthMarketersApi.suspend(m.id);
        showSuccess('Marketer suspended');
      } else {
        await growthMarketersApi.activate(m.id);
        showSuccess('Marketer activated');
      }
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Error updating status');
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
              <button type="button" onClick={() => setShowCreate(false)} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" disabled={creating}>Cancel</button>
              <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Success Modal */}
      {newMarketer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-full bg-green-100 p-2">
                <Check size={20} className="text-green-600" />
              </div>
              <h2 className="text-lg font-semibold">Marketer Created!</h2>
            </div>
            <div className="mb-4 space-y-3">
              <p className="text-sm text-gray-600">
                <strong>{newMarketer.name}</strong> has been registered successfully.
              </p>
              
              {/* Delivery Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                  <Smartphone size={18} className="text-blue-600" />
                  <span className="text-sm text-blue-700">Welcome SMS sent to {newMarketer.phone}</span>
                </div>
                {newMarketer.email && (
                  <div className="flex items-center gap-2 rounded-lg bg-purple-50 p-3">
                    <Mail size={18} className="text-purple-600" />
                    <span className="text-sm text-purple-700">Welcome email sent to {newMarketer.email}</span>
                  </div>
                )}
              </div>

              {/* Temporary Password - only show if returned by API */}
              {newMarketer.tempPassword && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <p className="mb-2 text-xs font-medium text-yellow-800 uppercase">Temporary Password</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono text-gray-800">
                      {newMarketer.tempPassword}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(newMarketer.tempPassword!)}
                      className="rounded bg-yellow-200 p-2 text-yellow-800 hover:bg-yellow-300"
                      title="Copy password"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Share Options */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-medium text-gray-700 uppercase">Share Welcome Message</p>
                
                {/* WhatsApp Share */}
                <a
                  href={`https://wa.me/${newMarketer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    newMarketer.tempPassword
                      ? `Welcome to KmerTrash ${newMarketer.name}! You've been registered as a Growth Marketer.\n\nYour temporary password: ${newMarketer.tempPassword}\n\nDownload the app and login with your phone number.`
                      : `Welcome to KmerTrash ${newMarketer.name}! You've been registered as a Growth Marketer.\n\nDownload the app and login with your phone number. Your password has been sent via SMS/email.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 flex items-center justify-center gap-2 rounded bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
                >
                  <MessageCircle size={18} />
                  Share via WhatsApp
                </a>

                {/* Copy Full Message */}
                <button
                  onClick={() => {
                    const message = newMarketer.tempPassword
                      ? `Welcome to KmerTrash ${newMarketer.name}! You've been registered as a Growth Marketer.\n\nYour temporary password: ${newMarketer.tempPassword}\n\nDownload the app and login with your phone number.`
                      : `Welcome to KmerTrash ${newMarketer.name}! You've been registered as a Growth Marketer.\n\nDownload the app and login with your phone number. Your password has been sent via SMS/email.`;
                    navigator.clipboard.writeText(message);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <Copy size={16} />
                  Copy Full Welcome Message
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setNewMarketer(null)}
                className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
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
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
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
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
