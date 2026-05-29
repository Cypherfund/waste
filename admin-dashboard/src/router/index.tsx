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
import PaymentProvidersPage from '../pages/PaymentProvidersPage';
import MarketersPage from '../pages/MarketersPage';
import GrowthLeadsPage from '../pages/GrowthLeadsPage';
import CommissionsPage from '../pages/CommissionsPage';
import MarketerPayoutsPage from '../pages/MarketerPayoutsPage';
import PendingPaymentsPage from '../pages/PendingPaymentsPage';
import CollectorFloatPage from '../pages/CollectorFloatPage';
import MarketingBudgetsPage from '../pages/MarketingBudgetsPage';
import MarketingCampaignsPage from '../pages/MarketingCampaignsPage';
import SystemCleanupPage from '../pages/SystemCleanupPage';
import AppUpdatesPage from '../pages/AppUpdatesPage';
import ReconciliationPage from '../pages/ReconciliationPage';

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
      { path: 'payment-providers', element: <PaymentProvidersPage /> },
      { path: 'marketers', element: <MarketersPage /> },
      { path: 'growth-leads', element: <GrowthLeadsPage /> },
      { path: 'commissions', element: <CommissionsPage /> },
      { path: 'marketer-payouts', element: <MarketerPayoutsPage /> },
      { path: 'pending-payments', element: <PendingPaymentsPage /> },
      { path: 'collector-float', element: <CollectorFloatPage /> },
      { path: 'marketing-budgets', element: <MarketingBudgetsPage /> },
      { path: 'marketing-campaigns', element: <MarketingCampaignsPage /> },
      { path: 'system-cleanup', element: <SystemCleanupPage /> },
      { path: 'app-updates', element: <AppUpdatesPage /> },
      { path: 'reconciliation', element: <ReconciliationPage /> },
    ],
  },
]);
