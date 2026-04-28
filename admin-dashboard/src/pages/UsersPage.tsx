import { useState, useCallback } from 'react';
import { usersApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../features/auth/AuthContext';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import ConfirmDialog from '../components/ConfirmDialog';
import type { AdminUser, UserDetail } from '../types';

export default function UsersPage() {
  const { user: adminUser } = useAuth();
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    user: AdminUser;
    action: 'activate' | 'deactivate';
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const fetchUsers = useCallback(() => {
    const params: Record<string, string> = {};
    if (roleFilter) params.role = roleFilter;
    if (activeFilter) params.isActive = activeFilter;
    return usersApi.list(params);
  }, [roleFilter, activeFilter]);

  const { data: users, loading, error, run } = useAsync<AdminUser[]>(fetchUsers);

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const isActive = confirmAction.action === 'activate';
      await usersApi.updateStatus(confirmAction.user.id, isActive);
      setFeedback(
        `${confirmAction.user.name} has been ${isActive ? 'activated' : 'deactivated'}.`,
      );
      setConfirmAction(null);
      run();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setFeedback(`Error: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = async (userId: string) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const details = await usersApi.getDetail(userId);
      setSelectedUser(details);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load details';
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Users</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Roles</option>
          <option value="HOUSEHOLD">Household</option>
          <option value="COLLECTOR">Collector</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {feedback && (
        <div className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
          {feedback}
          <button
            onClick={() => setFeedback('')}
            className="ml-2 text-blue-500 underline"
          >
            dismiss
          </button>
        </div>
      )}

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={run} />}

      {!loading && !error && users && (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const isSelf = u.id === adminUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.phone}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {u.avgRating != null ? Number(u.avgRating).toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(u.id)}
                          className="rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                        >
                          Details
                        </button>
                        {isSelf ? (
                          <span className="text-xs text-gray-400">You</span>
                        ) : u.isActive ? (
                          <button
                            onClick={() =>
                              setConfirmAction({ user: u, action: 'deactivate' })
                            }
                            className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setConfirmAction({ user: u, action: 'activate' })
                            }
                            className="rounded bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-100"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              User Details
            </h3>

            {detailLoading && <Spinner />}

            {!detailLoading && detailError && (
              <ErrorBox message={detailError} onRetry={() => handleViewDetails(selectedUser.id)} />
            )}

            {!detailLoading && !detailError && selectedUser && (
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">ID:</span>
                  <span className="ml-1 font-mono text-xs">{selectedUser.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Name:</span>
                  <span className="ml-1">{selectedUser.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-1">{selectedUser.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-1">{selectedUser.email || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Role:</span>
                  <span className="ml-1">{selectedUser.role}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-1">
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Avg Rating:</span>
                  <span className="ml-1">
                    {selectedUser.avgRating != null
                      ? Number(selectedUser.avgRating).toFixed(1)
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Total Completed:</span>
                  <span className="ml-1">{selectedUser.totalCompleted}</span>
                </div>
                {selectedUser.role === 'COLLECTOR' && (
                  <>
                    <div>
                      <span className="text-gray-500">Completed Jobs:</span>
                      <span className="ml-1">{selectedUser.completedJobs}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Earnings:</span>
                      <span className="ml-1">{selectedUser.totalEarnings} XAF</span>
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <span className="text-gray-500">Joined:</span>
                  <span className="ml-1">
                    {new Date(selectedUser.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-1">
                    {new Date(selectedUser.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setDetailError('');
                }}
                className="rounded border px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.action === 'deactivate'
            ? 'Deactivate User'
            : 'Activate User'
        }
        message={`Are you sure you want to ${confirmAction?.action} ${confirmAction?.user.name}?`}
        confirmLabel={confirmAction?.action === 'deactivate' ? 'Deactivate' : 'Activate'}
        variant={confirmAction?.action === 'deactivate' ? 'danger' : 'default'}
        loading={actionLoading}
        onConfirm={handleStatusChange}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
