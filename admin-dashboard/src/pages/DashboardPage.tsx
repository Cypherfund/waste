import { useCallback } from 'react';
import {
  Users,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  Shield,
  DollarSign,
  Star,
  Clock,
} from 'lucide-react';
import { statsApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import type { DashboardStats } from '../types';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className={`rounded-lg p-2.5 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const fetchStats = useCallback(() => statsApi.get(), []);
  const { data: stats, loading, error, run } = useAsync<DashboardStats>(fetchStats);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={run} />;
  if (!stats) return null;

  const cards: StatCardProps[] = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: <Users size={20} className="text-blue-600" />,
      color: 'bg-blue-50',
    },
    {
      label: 'Total Collectors',
      value: stats.totalCollectors,
      icon: <Users size={20} className="text-green-600" />,
      color: 'bg-green-50',
    },
    {
      label: 'Total Jobs',
      value: stats.totalJobs,
      icon: <Briefcase size={20} className="text-indigo-600" />,
      color: 'bg-indigo-50',
    },
    {
      label: 'Active Jobs',
      value: stats.activeJobs,
      icon: <Clock size={20} className="text-yellow-600" />,
      color: 'bg-yellow-50',
    },
    {
      label: 'Completed Jobs',
      value: stats.completedJobs,
      icon: <CheckCircle size={20} className="text-green-600" />,
      color: 'bg-green-50',
    },
    {
      label: 'Cancelled Jobs',
      value: stats.cancelledJobs,
      icon: <Briefcase size={20} className="text-red-600" />,
      color: 'bg-red-50',
    },
    {
      label: 'Flagged Collectors',
      value: stats.flaggedCollectors,
      icon: <Shield size={20} className="text-orange-600" />,
      color: 'bg-orange-50',
    },
    {
      label: 'Open Disputes',
      value: `${stats.openDisputes} / ${stats.totalDisputes}`,
      icon: <AlertTriangle size={20} className="text-red-600" />,
      color: 'bg-red-50',
    },
    {
      label: 'Avg Rating',
      value: Number(stats.avgRating ?? 0).toFixed(1),
      icon: <Star size={20} className="text-yellow-500" />,
      color: 'bg-yellow-50',
    },
    {
      label: 'Total Earnings (XAF)',
      value: Number(stats.earningsTotal ?? 0).toLocaleString(),
      icon: <DollarSign size={20} className="text-green-600" />,
      color: 'bg-green-50',
    },
    {
      label: 'Pending Earnings (XAF)',
      value: Number(stats.earningsPending ?? 0).toLocaleString(),
      icon: <DollarSign size={20} className="text-yellow-600" />,
      color: 'bg-yellow-50',
    },
    {
      label: 'Avg Completion (min)',
      value: stats.avgCompletionTimeMinutes,
      icon: <Clock size={20} className="text-blue-600" />,
      color: 'bg-blue-50',
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {stats.jobsByStatus && Object.keys(stats.jobsByStatus).length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Jobs by Status
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(stats.jobsByStatus).map(([status, count]) => (
              <div
                key={status}
                className="rounded border bg-white p-3 text-center shadow-sm"
              >
                <p className="text-lg font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
