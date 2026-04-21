import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  AlertTriangle,
  Shield,
  Settings,
  LogOut,
  Trash2,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/disputes', label: 'Disputes', icon: AlertTriangle },
  { to: '/fraud-flags', label: 'Fraud Flags', icon: Shield },
  { to: '/config', label: 'Config', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-gray-900 text-gray-300">
        <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-4">
          <Trash2 size={22} className="text-green-400" />
          <span className="text-sm font-bold text-white">WasteWise Admin</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors ${
                  isActive
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
