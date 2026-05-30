import { useState } from 'react';
import { systemCleanupApi, CleanupRequest, CleanupAnalysis, CleanupResult, CleanupFilters, CleanupComponents } from '../services/api/admin';
import Alert from '../components/Alert';

export default function SystemCleanupPage() {
  const [step, setStep] = useState(1);
  const [developerCode, setDeveloperCode] = useState('');
  const [filters, setFilters] = useState<CleanupFilters>({});
  const [components, setComponents] = useState<CleanupComponents>({});
  const [analysis, setAnalysis] = useState<CleanupAnalysis | null>(null);
  const [logId, setLogId] = useState<string | null>(null);
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const request: CleanupRequest = {
        developerCode,
        filters,
        components,
      };
      const response = await systemCleanupApi.analyze(request);
      setAnalysis(response.analysis);
      setLogId(response.logId);
      setStep(5);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    try {
      const request: CleanupRequest = {
        developerCode,
        confirmationPhrase,
        logId: logId || undefined,
        filters,
        components,
      };
      const response = await systemCleanupApi.execute(request);
      setResult(response);
      setStep(8);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleComponent = (key: keyof CleanupComponents) => {
    setComponents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateFilter = (key: keyof CleanupFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleRole = (role: string) => {
    const currentRoles = filters.roles || [];
    if (currentRoles.includes(role)) {
      updateFilter('roles', currentRoles.filter((r) => r !== role));
    } else {
      updateFilter('roles', [...currentRoles, role]);
    }
  };

  const getTotalCount = (analysis: CleanupAnalysis) => {
    return Object.values(analysis).reduce((sum, group) => {
      return sum + Object.values(group as Record<string, number>).reduce((s, count) => s + (count as number), 0);
    }, 0);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h1 className="text-2xl font-bold text-red-900 mb-2">⚠️ Developer Data Cleanup Tool</h1>
        <p className="text-red-700">
          This is a dangerous maintenance operation. It permanently deletes selected test data from the platform.
          This action cannot be undone.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Step 1: Developer Code */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Enter Developer Code</h2>
          <input
            type="password"
            value={developerCode}
            onChange={(e) => setDeveloperCode(e.target.value)}
            placeholder="Enter developer code"
            className="w-full p-3 border rounded-lg"
          />
          <button
            onClick={() => setStep(2)}
            disabled={!developerCode}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
      )}

      {/* Step 2: Filters */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Configure Filters</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Created Before</label>
              <input
                type="date"
                value={filters.createdBefore || ''}
                onChange={(e) => updateFilter('createdBefore', e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Created After</label>
              <input
                type="date"
                value={filters.createdAfter || ''}
                onChange={(e) => updateFilter('createdAfter', e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Phone Pattern (SQL LIKE)</label>
              <input
                type="text"
                value={filters.phonePattern || ''}
                onChange={(e) => updateFilter('phonePattern', e.target.value)}
                placeholder="e.g., +237600%"
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email Pattern (SQL LIKE)</label>
              <input
                type="text"
                value={filters.emailPattern || ''}
                onChange={(e) => updateFilter('emailPattern', e.target.value)}
                placeholder="e.g., %@test.com"
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Roles</label>
              <div className="flex gap-4">
                {['HOUSEHOLD', 'COLLECTOR', 'MARKETER'].map((role) => (
                  <label key={role} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.roles?.includes(role) || false}
                      onChange={() => toggleRole(role)}
                      className="mr-2"
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.forceAllNonAdmin || false}
                  onChange={(e) => updateFilter('forceAllNonAdmin', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Force All Non-Admin (bypass filter requirement)</span>
              </label>
            </div>
          </div>
          
          <div className="mt-6 flex gap-4">
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded">Back</button>
            <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 text-white rounded">Next</button>
          </div>
        </div>
      )}

      {/* Step 3: Components */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Step 3: Select Components to Clean</h2>
          
          <div className="space-y-3">
            {Object.keys({
              jobs: 'Jobs (jobs, proofs, ratings, disputes, fraud flags, location updates)',
              users: 'Users (non-admin users, addresses, payment methods, subscriptions)',
              growth: 'Growth (leads, marketers, commissions, marketer payouts)',
              marketingBudgets: 'Marketing Budgets (campaigns, budget periods, budget transactions)',
              payments: 'Payments (transactions, earnings, payouts, float ledger)',
              files: 'Files (unused files)',
              notifications: 'Notifications (notifications, marketer notifications)',
              admin: 'Admin (wallet ledger, reconciliation runs)',
            } as const).map((key) => (
              <label key={key} className="flex items-start">
                <input
                  type="checkbox"
                  checked={components[key as keyof CleanupComponents] || false}
                  onChange={() => toggleComponent(key as keyof CleanupComponents)}
                  className="mr-3 mt-1"
                />
                <span className="text-sm">
                  <strong>{key}:</strong> {({
                    jobs: 'Jobs (jobs, proofs, ratings, disputes, fraud flags, location updates)',
                    users: 'Users (non-admin users, addresses, payment methods, subscriptions)',
                    growth: 'Growth (leads, marketers, commissions, marketer payouts)',
                    marketingBudgets: 'Marketing Budgets (campaigns, budget periods, budget transactions)',
                    payments: 'Payments (transactions, earnings, payouts, float ledger)',
                    files: 'Files (unused files)',
                    notifications: 'Notifications (notifications, marketer notifications)',
                    admin: 'Admin (wallet ledger, reconciliation runs)',
                  } as any)[key]}
                </span>
              </label>
            ))}
          </div>
          
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Preserved (Never Deleted):</h3>
            <ul className="text-sm text-yellow-800 list-disc list-inside">
              <li>Admin users (role = ADMIN)</li>
              <li>system_config</li>
              <li>payment_providers</li>
              <li>subscription_plans</li>
              <li>supported_countries</li>
              <li>commission_schemes</li>
              <li>migrations table</li>
              <li>system_cleanup_logs</li>
            </ul>
          </div>
          
          <div className="mt-6 flex gap-4">
            <button onClick={() => setStep(2)} className="px-4 py-2 border rounded">Back</button>
            <button onClick={() => setStep(4)} className="px-6 py-2 bg-blue-600 text-white rounded">Next</button>
          </div>
        </div>
      )}

      {/* Step 4: Analyze */}
      {step === 4 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Step 4: Analyze</h2>
          <p className="text-gray-600 mb-4">
            This will count the records that would be deleted without actually deleting them.
          </p>
          
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300"
          >
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
          
          <button onClick={() => setStep(3)} className="ml-4 px-4 py-2 border rounded">Back</button>
        </div>
      )}

      {/* Step 5: Review Analysis */}
      {step === 5 && analysis && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Step 5: Review Analysis Results</h2>
          
          <div className="space-y-4">
            {Object.entries(analysis).map(([group, counts]) => (
              <div key={group} className="border rounded p-4">
                <h3 className="font-semibold capitalize mb-2">{group}</h3>
                <ul className="text-sm space-y-1">
                  {Object.entries(counts as Record<string, number>).map(([key, count]) => (
                    <li key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-mono">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <strong>Total Records to Delete:</strong> {getTotalCount(analysis)}
          </div>
          
          <div className="mt-6 flex gap-4">
            <button onClick={() => setStep(4)} className="px-4 py-2 border rounded">Back</button>
            <button onClick={() => setStep(6)} className="px-6 py-2 bg-blue-600 text-white rounded">Proceed to Execute</button>
          </div>
        </div>
      )}

      {/* Step 6: Confirmation Phrase */}
      {step === 6 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Step 6: Type Confirmation Phrase</h2>
          <p className="text-gray-600 mb-4">
            To prevent accidental deletion, type the exact phrase below:
          </p>
          
          <code className="block p-3 bg-gray-100 rounded mb-4 text-lg font-mono">DELETE TEST DATA</code>
          
          <input
            type="text"
            value={confirmationPhrase}
            onChange={(e) => setConfirmationPhrase(e.target.value)}
            placeholder="Type the confirmation phrase"
            className="w-full p-3 border rounded-lg"
          />
          
          <div className="mt-6 flex gap-4">
            <button onClick={() => setStep(5)} className="px-4 py-2 border rounded">Back</button>
            <button
              onClick={() => setStep(7)}
              disabled={confirmationPhrase !== 'DELETE TEST DATA'}
              className="px-6 py-2 bg-red-600 text-white rounded disabled:bg-gray-300"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Step 7: Execute */}
      {step === 7 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-900">Step 7: Execute Cleanup</h2>
          <p className="text-red-700 mb-4">
            This action is irreversible. You are about to delete {getTotalCount(analysis!)} records.
          </p>
          
          <button
            onClick={handleExecute}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded disabled:bg-gray-300"
          >
            {loading ? 'Executing...' : 'EXECUTE CLEANUP'}
          </button>
          
          <button onClick={() => setStep(6)} className="ml-4 px-4 py-2 border rounded">Cancel</button>
        </div>
      )}

      {/* Step 8: Results */}
      {step === 8 && result && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Cleanup Complete</h2>
          
          {result.errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-semibold text-red-900 mb-2">Errors:</h3>
              <ul className="text-sm text-red-800 list-disc list-inside">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="space-y-4">
            <h3 className="font-semibold">Deleted Counts:</h3>
            {Object.entries(result.deletedCounts).map(([group, counts]) => (
              <div key={group} className="border rounded p-4">
                <h4 className="font-semibold capitalize mb-2">{group}</h4>
                <ul className="text-sm space-y-1">
                  {Object.entries(counts as Record<string, number>).map(([key, count]) => (
                    <li key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-mono">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
            <strong>Total Records Deleted:</strong> {getTotalCount(result.deletedCounts)}
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => {
                setStep(1);
                setDeveloperCode('');
                setFilters({});
                setComponents({});
                setAnalysis(null);
                setLogId(null);
                setConfirmationPhrase('');
                setResult(null);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded"
            >
              Start New Cleanup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
