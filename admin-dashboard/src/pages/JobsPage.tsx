import { useState, useCallback } from 'react';
import { jobsApi, usersApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import Pagination from '../components/Pagination';
import HelpGuide from '../components/HelpGuide';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Job, JobListResponse, AdminUser } from '../types';

const JOB_STATUSES = [
  'PAYMENT_PENDING',
  'REQUESTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'VALIDATED',
  'RATED',
  'CANCELLED',
];

const PAYMENT_STATUSES = [
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'NOT_REQUIRED',
];

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Detail / assign modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [assignCollectorId, setAssignCollectorId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [reassignCollectorId, setReassignCollectorId] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignError, setReassignError] = useState('');
  const [paymentRejectReason, setPaymentRejectReason] = useState('');
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [paymentVerifyLoading, setPaymentVerifyLoading] = useState(false);
  const [paymentRejectLoading, setPaymentRejectLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const fetchJobs = useCallback(() => {
    const params: Record<string, string> = { page: String(page || 1), limit: '20' };
    if (statusFilter) params.status = statusFilter;
    if (paymentStatusFilter) params.paymentStatus = paymentStatusFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return jobsApi.list(params);
  }, [statusFilter, paymentStatusFilter, dateFrom, dateTo, page]);

  const { data, loading, error, run } = useAsync<JobListResponse>(fetchJobs);

  // Fetch collectors for assignment
  const fetchCollectors = useCallback(
    () => usersApi.list({ role: 'COLLECTOR', isActive: 'true', page: 1, limit: 100 }),
    [],
  );
  const { data: collectorsResponse } = useAsync(fetchCollectors);
  const collectors = collectorsResponse?.data || [];

  const handleAssign = async () => {
    if (!selectedJob || !assignCollectorId) return;
    setAssignLoading(true);
    setAssignError('');
    try {
      await jobsApi.manualAssign(selectedJob.id, assignCollectorId);
      setFeedback(`Job assigned successfully.`);
      setSelectedJob(null);
      setAssignCollectorId('');
      run();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Assignment failed';
      setAssignError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setAssignLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedJob) return;
    setShowCancelConfirm(true);
  };

  const handleCancelConfirmed = async () => {
    if (!selectedJob) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      await jobsApi.cancel(selectedJob.id, cancelReason);
      setFeedback(`Job cancelled successfully.`);
      setSelectedJob(null);
      setCancelReason('');
      setShowCancelConfirm(false);
      run();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Cancellation failed';
      setCancelError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedJob || !reassignCollectorId) return;
    setReassignLoading(true);
    setReassignError('');
    try {
      await jobsApi.manualReassign(selectedJob.id, reassignCollectorId);
      setFeedback(`Job reassigned successfully.`);
      setSelectedJob(null);
      setReassignCollectorId('');
      run();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Reassignment failed';
      setReassignError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setReassignLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedJob) return;
    setPaymentVerifyLoading(true);
    setPaymentError('');
    try {
      await jobsApi.verifyPayment(selectedJob.id);
      setFeedback(`Payment verified successfully. Job moved to REQUESTED status.`);
      setSelectedJob(null);
      run();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Payment verification failed';
      setPaymentError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setPaymentVerifyLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedJob) return;
    setPaymentRejectLoading(true);
    setPaymentError('');
    try {
      await jobsApi.rejectPayment(selectedJob.id, paymentRejectReason);
      setFeedback(`Payment rejected. Job cancelled.`);
      setSelectedJob(null);
      setPaymentRejectReason('');
      run();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Payment rejection failed';
      setPaymentError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setPaymentRejectLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Jobs</h1>

      <HelpGuide
        title="How to Manage Jobs"
        description="View and manage waste collection jobs including assignment, cancellation, and payment verification."
        steps={[
          "Filter jobs by status (Payment Pending, Requested, Assigned, In Progress, etc.)",
          "Filter by payment status (Pending, Verified, Rejected, Not Required)",
          "Filter by date range to find jobs within a specific period",
          "Click 'Details' to view job information and assign collectors",
          "Manually assign collectors to unassigned jobs",
          "Cancel jobs if needed with a reason",
        ]}
        tips={[
          "Payment Pending jobs require verification before payout",
          "Manually assign collectors when auto-assignment fails",
          "Verify payment proof images before approving",
        ]}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Job Statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => {
            setPaymentStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All Payment Statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div>
          <label className="mb-0.5 block text-xs text-gray-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-gray-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {feedback && (
        <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">
          {feedback}
          <button
            onClick={() => setFeedback('')}
            className="ml-2 text-green-500 underline"
          >
            dismiss
          </button>
        </div>
      )}

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={run} />}

      {!loading && !error && data && (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Household</th>
                  <th className="px-4 py-3">Collector</th>
                  <th className="px-4 py-3">Scheduled</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No jobs found.
                    </td>
                  </tr>
                )}
                {data.data.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {job.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {job.householdName || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {job.collectorName || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {job.scheduledDate} {job.scheduledTime}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.meta.totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Job Detail / Manual Assignment Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Job Details
            </h3>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">ID:</span>
                <span className="ml-1 font-mono text-xs">{selectedJob.id}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className="ml-1">
                  <StatusBadge status={selectedJob.status} />
                </span>
              </div>
              <div>
                <span className="text-gray-500">Household:</span>
                <div className="ml-1">
                  <div className="font-medium">{selectedJob.householdName || '—'}</div>
                  <div className="font-mono text-xs text-gray-500">{selectedJob.householdId}</div>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Collector:</span>
                <div className="ml-1">
                  {selectedJob.collectorName ? (
                    <>
                      <div className="font-medium">{selectedJob.collectorName}</div>
                      <div className="font-mono text-xs text-gray-500">{selectedJob.collectorId}</div>
                      {selectedJob.collectorPhone && (
                        <div className="text-xs text-gray-500">{selectedJob.collectorPhone}</div>
                      )}
                    </>
                  ) : (
                    <span>None</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Scheduled:</span>
                <span className="ml-1">
                  {selectedJob.scheduledDate} {selectedJob.scheduledTime}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Waste Type:</span>
                <span className="ml-1">{selectedJob.wasteType || '—'}</span>
              </div>
              {selectedJob.locationAddress && (
                <div className="col-span-2">
                  <span className="text-gray-500">Address:</span>
                  <span className="ml-1">{selectedJob.locationAddress}</span>
                </div>
              )}
              {selectedJob.notes && (
                <div className="col-span-2">
                  <span className="text-gray-500">Notes:</span>
                  <span className="ml-1">{selectedJob.notes}</span>
                </div>
              )}
              {selectedJob.paymentMethodName && (
                <div>
                  <span className="text-gray-500">Payment Method:</span>
                  <span className="ml-1">{selectedJob.paymentMethodName}</span>
                </div>
              )}
              {selectedJob.paymentRef && (
                <div>
                  <span className="text-gray-500">Payment Ref:</span>
                  <span className="ml-1 font-mono text-xs">{selectedJob.paymentRef}</span>
                </div>
              )}
              {selectedJob.paymentProofUrl && (
                <div className="col-span-2">
                  <span className="text-gray-500">Payment Proof:</span>
                  <div className="ml-1">
                    <a
                      href={selectedJob.paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View Proof
                    </a>
                  </div>
                </div>
              )}
              {selectedJob.quotedPrice && (
                <div>
                  <span className="text-gray-500">Price:</span>
                  <span className="ml-1">{selectedJob.quotedPrice} XAF</span>
                </div>
              )}
              {selectedJob.collectorEarnings !== undefined && (
                <div>
                  <span className="text-gray-500">Collector Earnings:</span>
                  <span className="ml-1">{selectedJob.collectorEarnings} XAF</span>
                </div>
              )}
            </div>

            {/* Payment Verification — only for PAYMENT_PENDING jobs */}
            {selectedJob.status === 'PAYMENT_PENDING' && (
              <div className="mb-4 rounded border border-purple-200 bg-purple-50 p-3">
                <p className="mb-2 text-sm font-medium text-purple-800">
                  Payment Verification Required
                </p>
                <p className="mb-3 text-xs text-purple-600">
                  User has submitted payment information. Please verify the payment before
                  allowing this job to proceed to assignment.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyPayment}
                    disabled={paymentVerifyLoading}
                    className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {paymentVerifyLoading ? 'Verifying...' : 'Verify Payment'}
                  </button>
                  <button
                    onClick={() => setShowRejectReason(true)}
                    disabled={paymentRejectLoading}
                    className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
                {showRejectReason && (
                  <div className="mt-3">
                    <textarea
                      value={paymentRejectReason}
                      onChange={(e) => setPaymentRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      rows={2}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={handleRejectPayment}
                        disabled={paymentRejectLoading || !paymentRejectReason}
                        className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {paymentRejectLoading ? 'Rejecting...' : 'Confirm Rejection'}
                      </button>
                      <button
                        onClick={() => {
                          setShowRejectReason(false);
                          setPaymentRejectReason('');
                          setPaymentError('');
                        }}
                        className="rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {paymentError && (
                  <p className="mt-2 text-xs text-red-600">{paymentError}</p>
                )}
              </div>
            )}

            {/* Manual Assignment — only for REQUESTED jobs */}
            {selectedJob.status === 'REQUESTED' && (
              <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3">
                <p className="mb-2 text-sm font-medium text-blue-800">
                  Manual Assignment
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={assignCollectorId}
                    onChange={(e) => setAssignCollectorId(e.target.value)}
                    className="flex-1 rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="">Select Collector...</option>
                    {(collectors ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!assignCollectorId || assignLoading}
                    className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {assignLoading ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
                {assignError && (
                  <p className="mt-2 text-xs text-red-600">{assignError}</p>
                )}
              </div>
            )}

            {/* Manual Reassignment — only for ASSIGNED jobs */}
            {selectedJob.status === 'ASSIGNED' && (
              <div className="mb-4 rounded border border-orange-200 bg-orange-50 p-3">
                <p className="mb-2 text-sm font-medium text-orange-800">
                  Reassign Job
                </p>
                <p className="mb-2 text-xs text-orange-600">
                  Current collector:{' '}
                  {selectedJob.collectorId
                    ? `${selectedJob.collectorId.slice(0, 8)}...`
                    : 'None'}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={reassignCollectorId}
                    onChange={(e) => setReassignCollectorId(e.target.value)}
                    className="flex-1 rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="">Select New Collector...</option>
                    {(collectors ?? [])
                      .filter((c) => c.id !== selectedJob.collectorId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleReassign}
                    disabled={!reassignCollectorId || reassignLoading}
                    className="rounded bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    {reassignLoading ? 'Reassigning...' : 'Reassign'}
                  </button>
                </div>
                {reassignError && (
                  <p className="mt-2 text-xs text-red-600">{reassignError}</p>
                )}
              </div>
            )}

            {/* Cancel Job — only for active jobs */}
            {['REQUESTED', 'ASSIGNED', 'IN_PROGRESS'].includes(selectedJob.status) && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3">
                <p className="mb-2 text-sm font-medium text-red-800">
                  Cancel Job
                </p>
                <div className="mb-2">
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation (optional)"
                    className="w-full rounded border px-2 py-1.5 text-sm"
                    rows={2}
                  />
                </div>
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelling...' : 'Cancel Job'}
                </button>
                {cancelError && (
                  <p className="mt-2 text-xs text-red-600">{cancelError}</p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSelectedJob(null);
                  setAssignCollectorId('');
                  setAssignError('');
                  setCancelReason('');
                  setCancelError('');
                  setReassignCollectorId('');
                  setReassignError('');
                  setShowCancelConfirm(false);
                }}
                className="rounded border px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={showCancelConfirm}
        title="Cancel Job"
        message={`Are you sure you want to cancel job ${selectedJob?.id.slice(0, 8)}? This action cannot be undone.`}
        confirmLabel="Cancel Job"
        cancelLabel="Go Back"
        variant="danger"
        loading={cancelLoading}
        onConfirm={handleCancelConfirmed}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PAYMENT_PENDING: 'bg-purple-100 text-purple-700',
    REQUESTED: 'bg-blue-100 text-blue-700',
    ASSIGNED: 'bg-yellow-100 text-yellow-700',
    IN_PROGRESS: 'bg-orange-100 text-orange-700',
    COMPLETED: 'bg-green-100 text-green-700',
    VALIDATED: 'bg-emerald-100 text-emerald-700',
    RATED: 'bg-teal-100 text-teal-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}
