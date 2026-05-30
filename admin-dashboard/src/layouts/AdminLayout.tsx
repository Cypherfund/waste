import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  AlertTriangle,
  Shield,
  Settings,
  LogOut,
  Trash2,
  DollarSign,
  CreditCard,
  Wallet,
  Megaphone,
  Target,
  Trophy,
  Banknote,
  ClipboardCheck,
  Coins,
  Menu,
  X,
  Smartphone,
  Scale,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/earnings', label: 'Earnings', icon: DollarSign },
  { to: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/payouts', label: 'Payouts', icon: Wallet },
  { to: '/disputes', label: 'Disputes', icon: AlertTriangle },
  { to: '/fraud-flags', label: 'Fraud Flags', icon: Shield },
  { to: '/payment-providers', label: 'Payment Providers', icon: CreditCard },
  { to: '/config', label: 'Config', icon: Settings },
  { to: '/app-updates', label: 'App Updates', icon: Smartphone },
  { to: '/system-cleanup', label: 'Developer Cleanup', icon: Trash2, danger: true },
  // Growth
  { to: '/marketing-budgets', label: 'Marketing Budgets', icon: Wallet },
  { to: '/marketing-campaigns', label: 'Marketing Campaigns', icon: Target },
  { to: '/marketers', label: 'Marketers', icon: Megaphone },
  { to: '/growth-leads', label: 'Growth Leads', icon: Target },
  { to: '/commissions', label: 'Commissions', icon: Trophy },
  { to: '/marketer-payouts', label: 'Mkt Payouts', icon: Banknote },
  // Payments
  { to: '/pending-payments', label: 'Pending Payments', icon: ClipboardCheck },
  { to: '/collector-float', label: 'Collector Float', icon: Coins },
  { to: '/reconciliation', label: 'Reconciliation', icon: Scale },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between bg-gray-900 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Trash2 size={22} className="text-green-400" />
          <span className="text-sm font-bold text-white">KmerTrash Admin</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rounded p-2 text-gray-300 hover:bg-gray-800"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar - Desktop: always visible, Mobile: overlay */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-gray-900 text-gray-300 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Desktop Logo */}
        <div className="hidden items-center gap-2 border-b border-gray-800 px-4 py-4 lg:flex">
          <Trash2 size={22} className="text-green-400" />
          <span className="text-sm font-bold text-white">KmerTrash Admin</span>
        </div>

        {/* Mobile close button */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Trash2 size={22} className="text-green-400" />
            <span className="text-sm font-bold text-white">KmerTrash Admin</span>
          </div>
          <button
            onClick={closeSidebar}
            className="rounded p-2 text-gray-400 hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, danger }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors ${
                  danger
                    ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
                    : isActive
                    ? 'bg-green-700/30 text-green-400 font-medium'
                    : 'hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-800 p-3">
          <div className="mb-2 truncate px-2 text-xs text-gray-500">
            {user?.name} ({user?.role})
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="mx-auto max-w-7xl p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
