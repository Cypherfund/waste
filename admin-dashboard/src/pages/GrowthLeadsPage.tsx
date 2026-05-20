import { useEffect, useState } from 'react';
import { GrowthLead } from '../types';
import { growthLeadsApi } from '../services/api/growth';
import Pagination from '../components/Pagination';
import HelpGuide from '../components/HelpGuide';
import { usePagination } from '../hooks/usePagination';

const PAGE_SIZE = 20;

export default function GrowthLeadsPage() {
  const [leads, setLeads] = useState<GrowthLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { page, setPage, resetPage } = usePagination();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const res = await growthLeadsApi.list(params);
      setLeads(res.data);
      setTotal(res.total);
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.message || e.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { resetPage(); }, [statusFilter]);
  useEffect(() => { load(); }, [statusFilter, page]);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      INVITED: 'bg-blue-100 text-blue-700',
      REGISTERED: 'bg-green-100 text-green-700',
      QUALIFIED: 'bg-purple-100 text-purple-700',
      EXPIRED: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const smsBadge = (status: string) => {
    const colors: Record<string, string> = {
      SENT: 'bg-green-50 text-green-600',
      DELIVERED: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-600',
      PENDING: 'bg-yellow-50 text-yellow-700',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Growth Leads</h1>
        <p className="text-sm text-gray-500">Leads submitted by marketers</p>
      </div>

      <HelpGuide
        title="How to Manage Growth Leads"
        description="Review and manage leads submitted by marketers through their referral programs."
        steps={[
          "Filter leads by status (Invited, Registered, Qualified, Expired)",
          "Review lead details including marketer, type, and source",
          "Manually expire leads if they're no longer valid",
          "Track SMS delivery status for invitation messages",
        ]}
        tips={[
          "Qualified leads generate commissions for marketers",
          "Expired leads do not generate commissions",
          "Resend SMS for leads with failed delivery status",
        ]}
      />

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {['', 'INVITED', 'REGISTERED', 'QUALIFIED', 'EXPIRED'].map((s) => (
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
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={load} className="mt-2 text-sm text-red-500 underline hover:text-red-700">Retry</button>
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No leads found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2 text-xs text-gray-500">
            <span>{total} lead{total !== 1 ? 's' : ''}</span>
            <span>Page {page} of {Math.ceil(total / PAGE_SIZE) || 1}</span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">SMS</th>
                <th className="px-4 py-3">Invited</th>
                <th className="px-4 py-3">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{l.name}</td>
                  <td className="px-4 py-3 text-gray-600">{l.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${l.type === 'HOUSEHOLD' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                      {l.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.area || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(l.status)}</td>
                  <td className="px-4 py-3">{smsBadge(l.smsStatus)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(l.invitedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(l.expiresAt).toLocaleDateString()}
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
    </div>
  );
}
