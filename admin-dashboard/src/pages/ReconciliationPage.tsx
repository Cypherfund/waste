import { useState, useEffect } from 'react';
import {
  Download,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { reconciliationApi } from '../services/api/admin';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import type { ReconciliationSummary, UnreconciledItem } from '../types';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className={`rounded-lg p-2.5 ${color}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      {trend === 'up' && <TrendingUp size={16} className="text-green-600" />}
      {trend === 'down' && <TrendingDown size={16} className="text-red-600" />}
    </div>
  );
}

export default function ReconciliationPage() {
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showUnreconciled, setShowUnreconciled] = useState(false);
  const [summaries, setSummaries] = useState<ReconciliationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreconciledItems, setUnreconciledItems] = useState<UnreconciledItem[]>([]);
  const [loadingUnreconciled, setLoadingUnreconciled] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reconciliationApi.getSummary(fromDate, toDate);
      setSummaries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreconciled = async () => {
    setLoadingUnreconciled(true);
    try {
      const data = await reconciliationApi.getUnreconciled(fromDate, toDate);
      setUnreconciledItems(data);
    } catch (err) {
      console.error('Failed to fetch unreconciled items:', err);
    } finally {
      setLoadingUnreconciled(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [fromDate, toDate]);

  const handleExport = async () => {
    try {
      const blob = await reconciliationApi.exportCsv(fromDate, toDate);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reconciliation_${fromDate}_to_${toDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleSaveDaily = async () => {
    try {
      await reconciliationApi.saveDaily(toDate);
      fetchSummary();
    } catch (err) {
      console.error('Failed to save daily summary:', err);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={fetchSummary} />;

  const totalMoneyIn = summaries?.reduce((sum, s) => sum + s.integratedProviderPayments + s.manualProviderPayments + s.walletTopups + s.cashCollected, 0) || 0;
  const totalMoneyOut = summaries?.reduce((sum, s) => sum + s.collectorEarnings + s.marketerCommissions + s.approvedPayouts, 0) || 0;
  const totalUnreconciled = summaries?.reduce((sum, s) => sum + s.unreconciledItems, 0) || 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reconciliation</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={handleSaveDaily}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <CheckCircle size={16} />
            Save Daily Summary
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Money In (XAF)"
          value={totalMoneyIn.toLocaleString()}
          icon={<DollarSign size={20} className="text-green-600" />}
          color="bg-green-50"
          trend="up"
        />
        <StatCard
          label="Total Money Out (XAF)"
          value={totalMoneyOut.toLocaleString()}
          icon={<DollarSign size={20} className="text-red-600" />}
          color="bg-red-50"
          trend="down"
        />
        <StatCard
          label="Wallet Liabilities (XAF)"
          value={summaries?.reduce((sum, s) => sum + s.walletBalanceLiabilities, 0)?.toLocaleString() || '0'}
          icon={<AlertTriangle size={20} className="text-orange-600" />}
          color="bg-orange-50"
        />
        <StatCard
          label="Unreconciled Items"
          value={totalUnreconciled}
          icon={<AlertTriangle size={20} className="text-red-600" />}
          color="bg-red-50"
          trend={totalUnreconciled > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Detailed Summary Table */}
      <div className="mb-8 rounded-lg border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Daily Summaries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Money In</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Money Out</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Wallet Liabilities</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Unreconciled</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {summaries?.map((summary) => (
                <tr key={summary.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{summary.summaryDate}</td>
                  <td className="px-6 py-3 text-right text-gray-700">
                    {(summary.integratedProviderPayments + summary.manualProviderPayments + summary.walletTopups + summary.cashCollected).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-700">
                    {(summary.collectorEarnings + summary.marketerCommissions + summary.approvedPayouts).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-700">{summary.walletBalanceLiabilities.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${summary.unreconciledItems > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {summary.unreconciledItems}
                    </span>
                  </td>
                </tr>
              ))}
              {(!summaries || summaries.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No reconciliation data for selected date range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unreconciled Items */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Unreconciled Items</h2>
          <button
            onClick={() => {
              setShowUnreconciled(!showUnreconciled);
              if (!showUnreconciled) fetchUnreconciled();
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {showUnreconciled ? 'Hide' : 'Show'}
          </button>
        </div>
        {showUnreconciled && (
          <div className="overflow-x-auto">
            {loadingUnreconciled ? (
              <div className="px-6 py-8">
                <Spinner />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Type</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Description</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500">Amount</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Entity</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {unreconciledItems?.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{item.type}</td>
                      <td className="px-6 py-3 text-gray-700">{item.description}</td>
                      <td className="px-6 py-3 text-right text-gray-700">{item.amount.toLocaleString()}</td>
                      <td className="px-6 py-3 text-gray-700">{item.entityType}: {item.entityId}</td>
                      <td className="px-6 py-3 text-gray-700">{new Date(item.date).toISOString().split('T')[0]}</td>
                      <td className="px-6 py-3 text-gray-700">{item.reason}</td>
                    </tr>
                  ))}
                  {(!unreconciledItems || unreconciledItems.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No unreconciled items for selected date range
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
