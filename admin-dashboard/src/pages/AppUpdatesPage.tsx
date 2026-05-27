import { useState, useCallback } from 'react';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import {
  Smartphone,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Edit,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import client from '../services/api/client';

// ── Types ──────────────────────────────────────────────────────────────────

type Platform = 'ANDROID' | 'IOS' | 'ALL';
type AppType = 'HOUSEHOLD' | 'COLLECTOR' | 'MARKETER' | 'ALL';
type UpdateType = 'OPTIONAL' | 'FORCE';

interface AppVersion {
  id: number;
  platform: Platform;
  appType: AppType;
  versionName: string;
  buildNumber: number;
  minSupportedBuild: number;
  latestBuild: number;
  updateType: UpdateType;
  title: string;
  message: string;
  storeUrl: string | null;
  releaseNotes: string | null;
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
}

// ── API ────────────────────────────────────────────────────────────────────

const appUpdatesApi = {
  list: () => client.get<AppVersion[]>('/app-updates').then((r) => r.data),
  create: (data: Omit<AppVersion, 'id' | 'isActive' | 'publishedAt' | 'createdAt'>) =>
    client.post<AppVersion>('/app-updates', data).then((r) => r.data),
  update: (id: number, data: Partial<AppVersion>) =>
    client.patch<AppVersion>(`/app-updates/${id}`, data).then((r) => r.data),
  publish: (id: number) =>
    client.post<AppVersion>(`/app-updates/${id}/publish`).then((r) => r.data),
  deactivate: (id: number) =>
    client.post<AppVersion>(`/app-updates/${id}/deactivate`).then((r) => r.data),
  sendNotification: (id: number) =>
    client
      .post<{ sent: number; failed: number }>(`/app-updates/${id}/send-notification`)
      .then((r) => r.data),
};

// ── Blank form ─────────────────────────────────────────────────────────────

const blank = (): Omit<AppVersion, 'id' | 'isActive' | 'publishedAt' | 'createdAt'> => ({
  platform: 'ALL',
  appType: 'ALL',
  versionName: '',
  buildNumber: 1,
  minSupportedBuild: 1,
  latestBuild: 1,
  updateType: 'OPTIONAL',
  title: '',
  message: '',
  storeUrl: '',
  releaseNotes: '',
});

// ── Component ──────────────────────────────────────────────────────────────

export default function AppUpdatesPage() {
  const fetchVersions = useCallback(() => appUpdatesApi.list(), []);
  const { data: versions, loading, error, run: reload } = useAsync<AppVersion[]>(fetchVersions);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(blank());
    setShowForm(true);
    setFeedback(null);
  };

  const openEdit = (v: AppVersion) => {
    setEditingId(v.id);
    setForm({
      platform: v.platform,
      appType: v.appType,
      versionName: v.versionName,
      buildNumber: v.buildNumber,
      minSupportedBuild: v.minSupportedBuild,
      latestBuild: v.latestBuild,
      updateType: v.updateType,
      title: v.title,
      message: v.message,
      storeUrl: v.storeUrl ?? '',
      releaseNotes: v.releaseNotes ?? '',
    });
    setShowForm(true);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      if (editingId != null) {
        await appUpdatesApi.update(editingId, form);
        setFeedback({ type: 'ok', msg: 'Record updated.' });
      } else {
        await appUpdatesApi.create(form);
        setFeedback({ type: 'ok', msg: 'Record created.' });
      }
      setShowForm(false);
      setEditingId(null);
      reload();
    } catch (err: any) {
      setFeedback({
        type: 'err',
        msg: err?.response?.data?.message ?? 'Save failed.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await appUpdatesApi.publish(id);
      setFeedback({ type: 'ok', msg: 'Published and activated.' });
      reload();
    } catch {
      setFeedback({ type: 'err', msg: 'Publish failed.' });
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await appUpdatesApi.deactivate(id);
      setFeedback({ type: 'ok', msg: 'Deactivated.' });
      reload();
    } catch {
      setFeedback({ type: 'err', msg: 'Deactivate failed.' });
    }
  };

  const handleSendNotification = async (id: number) => {
    try {
      const res = await appUpdatesApi.sendNotification(id);
      setFeedback({ type: 'ok', msg: `Notification sent to ${res.sent} users (${res.failed} failed).` });
    } catch {
      setFeedback({ type: 'err', msg: 'Failed to send notification.' });
    }
  };

  const inputCls =
    'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500';
  const selectCls = inputCls;
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone size={20} className="text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">App Updates</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus size={16} /> New Update Record
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {feedback.type === 'ok' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {feedback.msg}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            {editingId != null ? 'Edit Update Record' : 'Create Update Record'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Platform */}
              <div>
                <label className={labelCls}>Platform</label>
                <select className={selectCls} value={form.platform} onChange={(e) => setField('platform', e.target.value as Platform)}>
                  <option value="ALL">All Platforms</option>
                  <option value="ANDROID">Android</option>
                  <option value="IOS">iOS</option>
                </select>
              </div>
              {/* App Type */}
              <div>
                <label className={labelCls}>App Type</label>
                <select className={selectCls} value={form.appType} onChange={(e) => setField('appType', e.target.value as AppType)}>
                  <option value="ALL">All Apps</option>
                  <option value="HOUSEHOLD">Household</option>
                  <option value="COLLECTOR">Collector</option>
                  <option value="MARKETER">Marketer</option>
                </select>
              </div>
              {/* Update Type */}
              <div>
                <label className={labelCls}>Update Type</label>
                <select className={selectCls} value={form.updateType} onChange={(e) => setField('updateType', e.target.value as UpdateType)}>
                  <option value="OPTIONAL">Optional</option>
                  <option value="FORCE">Force (required)</option>
                </select>
              </div>
              {/* Version Name */}
              <div>
                <label className={labelCls}>Latest Version Name</label>
                <input className={inputCls} placeholder="e.g. 1.1.0" value={form.versionName} onChange={(e) => setField('versionName', e.target.value)} required />
              </div>
              {/* Latest Build */}
              <div>
                <label className={labelCls}>Latest Build Number</label>
                <input type="number" min={1} className={inputCls} value={form.latestBuild} onChange={(e) => setField('latestBuild', Number(e.target.value))} required />
              </div>
              {/* Min Supported Build */}
              <div>
                <label className={labelCls}>Min Supported Build</label>
                <input type="number" min={1} className={inputCls} value={form.minSupportedBuild} onChange={(e) => setField('minSupportedBuild', Number(e.target.value))} required />
                <p className="mt-1 text-xs text-gray-500">Builds below this get force-updated</p>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className={labelCls}>Title</label>
              <input className={inputCls} placeholder="e.g. Update Required" value={form.title} onChange={(e) => setField('title', e.target.value)} required />
            </div>
            {/* Message */}
            <div>
              <label className={labelCls}>Message</label>
              <textarea rows={2} className={inputCls} placeholder="Shown to users in the update prompt" value={form.message} onChange={(e) => setField('message', e.target.value)} required />
            </div>
            {/* Store URL */}
            <div>
              <label className={labelCls}>Store URL</label>
              <input className={inputCls} placeholder="https://play.google.com/store/..." value={form.storeUrl ?? ''} onChange={(e) => setField('storeUrl', e.target.value)} />
            </div>
            {/* Release Notes */}
            <div>
              <label className={labelCls}>Release Notes (one per line)</label>
              <textarea rows={4} className={inputCls} placeholder="Improved payment flow&#10;Better booking tracking&#10;Bug fixes" value={form.releaseNotes ?? ''} onChange={(e) => setField('releaseNotes', e.target.value)} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editingId != null ? 'Save Changes' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}

      {versions && versions.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
          No app update records yet. Create one to get started.
        </div>
      )}

      {versions && versions.length > 0 && (
        <div className="space-y-3">
          {versions.map((v) => (
            <div
              key={v.id}
              className={`rounded-lg border bg-white shadow-sm ${
                v.isActive ? 'border-green-300' : 'border-gray-200'
              }`}
            >
              {/* Row header */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                {/* Status badge */}
                {v.isActive ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                    Inactive
                  </span>
                )}

                {/* Update type */}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    v.updateType === 'FORCE'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {v.updateType}
                </span>

                {/* Platform + App Type */}
                <span className="text-sm font-medium text-gray-800">
                  {v.platform} / {v.appType}
                </span>

                {/* Version */}
                <span className="ml-auto text-sm font-semibold text-gray-700">
                  v{v.versionName} (build {v.latestBuild}) · min: {v.minSupportedBuild}
                </span>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {expandedId === v.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {/* Expanded detail + actions */}
              {expandedId === v.id && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">{v.title}</p>
                  <p className="text-sm text-gray-600">{v.message}</p>
                  {v.releaseNotes && (
                    <ul className="ml-4 list-disc text-sm text-gray-600 space-y-0.5">
                      {v.releaseNotes.split('\n').filter(Boolean).map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                  {v.storeUrl && (
                    <p className="truncate text-xs text-blue-600">
                      <a href={v.storeUrl} target="_blank" rel="noreferrer">{v.storeUrl}</a>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => openEdit(v)}
                      className="flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    {!v.isActive ? (
                      <button
                        onClick={() => handlePublish(v.id)}
                        className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                      >
                        <CheckCircle size={14} /> Publish
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeactivate(v.id)}
                        className="flex items-center gap-1.5 rounded bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
                      >
                        <XCircle size={14} /> Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => handleSendNotification(v.id)}
                      className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Send size={14} /> Send Notification
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
