import { createBrowserRouter } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { RequireAuth } from '../features/auth/RequireAuth';
import LoginPage from '../features/auth/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import UsersPage from '../pages/UsersPage';
import JobsPage from '../pages/JobsPage';
import DisputesPage from '../pages/DisputesPage';
import FraudFlagsPage from '../pages/FraudFlagsPage';
import ConfigPage from '../pages/ConfigPage';
import EarningsPage from '../pages/EarningsPage';
import SubscriptionsPage from '../pages/SubscriptionsPage';
import PayoutsPage from '../pages/PayoutsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'jobs', element: <JobsPage /> },
      { path: 'disputes', element: <DisputesPage /> },
      { path: 'fraud-flags', element: <FraudFlagsPage /> },
      { path: 'earnings', element: <EarningsPage /> },
      { path: 'subscriptions', element: <SubscriptionsPage /> },
      { path: 'payouts', element: <PayoutsPage /> },
      { path: 'config', element: <ConfigPage /> },
    ],
  },
]);
