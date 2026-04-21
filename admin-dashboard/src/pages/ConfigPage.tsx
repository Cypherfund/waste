import { useState, useCallback } from 'react';
import { configApi } from '../services/api/admin';
import { useAsync } from '../hooks/useAsync';
import Spinner from '../components/Spinner';
import ErrorBox from '../components/ErrorBox';
import type { SystemConfig } from '../types';
import { Save, Check } from 'lucide-react';

export default function ConfigPage() {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchConfig = useCallback(
    () => configApi.list(categoryFilter || undefined),
    [categoryFilter],
  );
  const { data: configs, loading, error, run } = useAsync<SystemConfig[]>(fetchConfig);

  const categories = configs
    ? [...new Set(configs.map((c) => c.category).filter(Boolean))]
    : [];

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      await configApi.update(key, editValue);
      setFeedback(`"${key}" updated successfully.`);
      setEditingKey(null);
      run();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Update failed';
      setFeedback(`Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">
        System Configuration
      </h1>

      {categories.length > 0 && (
        <div className="mb-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

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

      {!loading && !error && configs && (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {configs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No config values found.
                  </td>
                </tr>
              )}
              {configs.map((c) => {
                const isEditing = editingKey === c.key;
                return (
                  <tr key={c.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {c.key}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded border px-2 py-1 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(c.key);
                            if (e.key === 'Escape') setEditingKey(null);
                          }}
                        />
                      ) : (
                        <span className="font-mono text-sm text-gray-700">
                          {c.value}
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-500">
                      {c.description || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSave(c.key)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {saving ? (
                              '...'
                            ) : (
                              <>
                                <Check size={12} /> Save
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingKey(c.key);
                            setEditValue(c.value);
                          }}
                          className="inline-flex items-center gap-1 rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                        >
                          <Save size={12} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
