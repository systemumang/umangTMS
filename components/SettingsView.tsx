import React, { useEffect, useMemo, useState } from 'react';
import { Save, Key, MessageSquare, Database, Loader2, Type, Plus, Trash2, Search, RotateCcw } from 'lucide-react';
import { AppSettings } from '../types';
import { useLabels } from '../labelOverrides';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => Promise<void> | void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate }) => {
  const { getViewLabel } = useLabels();
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  type Row = { id: string; key: string; label: string };

  const parseMap = (raw: unknown): Record<string, string> => {
    if (!raw) return {};
    if (typeof raw === 'object') {
      const rec = raw as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const k of Object.keys(rec)) {
        const v = rec[k];
        if (typeof v === 'string' && k.trim() && v.trim()) out[k.trim()] = v.trim();
      }
      return out;
    }
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return {};
      try { return parseMap(JSON.parse(s)); } catch { return {}; }
    }
    return {};
  };

  const rowsFromMap = (map: Record<string, string>, prefix: string): Row[] =>
    Object.keys(map).sort().map((k) => ({ id: `${prefix}_${k}`, key: k, label: map[k] }));

  const [viewRows, setViewRows] = useState<Row[]>([]);
  const [fieldRows, setFieldRows] = useState<Row[]>([]);
  const [viewSearch, setViewSearch] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');

  const makeId = () => `r_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const buildMapFromRows = (rows: Row[]) => {
    const errors: string[] = [];
    const map: Record<string, string> = {};
    const seen = new Set<string>();

    for (const r of rows) {
      const key = String(r.key || '').trim();
      const label = String(r.label || '').trim();
      if (!key && !label) continue;
      if (!key) { errors.push('Key cannot be empty.'); continue; }
      if (!label) { errors.push(`Display name cannot be empty for key: ${key}`); continue; }
      if (seen.has(key)) { errors.push(`Duplicate key: ${key}`); continue; }
      seen.add(key);
      map[key] = label;
    }

    return { map, errors };
  };

  useEffect(() => {
    setFormData({ ...settings });
    setViewRows(rowsFromMap(parseMap(settings?.viewLabelOverrides), 'v'));
    setFieldRows(rowsFromMap(parseMap(settings?.fieldLabelOverrides), 'f'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    setIsSaved(false);
    try {
      await onUpdate(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error: any) {
      setSaveError(error?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-white border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-gray-900 transition-all";
  const labelClass = "text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto">
	      <div className="flex justify-between items-center">
	        <div>
	          <h2 className="text-2xl font-bold text-indigo-600">{getViewLabel('settings', 'Application Settings')}</h2>
	          <p className="text-sm text-gray-500 mt-1">Configure global tokens and external API credentials</p>
	        </div>
        {isSaved && (
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium animate-in fade-in slide-in-from-right-4 duration-300">
            Settings saved successfully!
          </span>
        )}
      </div>

	      <form onSubmit={async (e) => {
          e.preventDefault();
          setIsSaving(true);
          setSaveError('');
          setIsSaved(false);

          const v = buildMapFromRows(viewRows);
          const f = buildMapFromRows(fieldRows);
          const errs = [...v.errors, ...f.errors];
          if (errs.length > 0) {
            setSaveError(errs[0]);
            setIsSaving(false);
            return;
          }

          const payload: AppSettings = {
            ...formData,
            viewLabelOverrides: JSON.stringify(v.map),
            fieldLabelOverrides: JSON.stringify(f.map),
          };

          try {
            await onUpdate(payload);
            setFormData(payload);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
          } catch (error: any) {
            setSaveError(error?.message || 'Failed to save settings.');
          } finally {
            setIsSaving(false);
          }
        }} className="space-y-8">
        {/* Core Integration Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
            <Key className="text-indigo-600" size={18} />
            <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wide">Core Office & Bot Integration</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Office Token ID</label>
              <input name="officeTokenId" value={formData.officeTokenId} onChange={handleChange} className={inputClass} placeholder="Enter Token ID" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Office Telegram Group ID</label>
              <input name="officeTelegramGroupId" value={formData.officeTelegramGroupId} onChange={handleChange} className={inputClass} placeholder="-100xxxxxxxx" />
            </div>
          </div>
        </div>

        {/* MAS Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
            <Database className="text-indigo-600" size={18} />
            <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wide">MAS Credentials</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>MAS ID</label>
              <input name="masId" value={formData.masId} onChange={handleChange} className={inputClass} placeholder="Enter MAS Identification" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>MAS Password</label>
              <input name="masPassword" type="password" value={formData.masPassword} onChange={handleChange} className={inputClass} placeholder="••••••••" />
            </div>
          </div>
        </div>

	        {/* Meta (WhatsApp API) Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
            <MessageSquare className="text-indigo-600" size={18} />
            <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wide">Meta / WhatsApp Business Settings</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <label className={labelClass}>Permanent Meta Access Token</label>
              <input name="metaAccessToken" value={formData.metaAccessToken} onChange={handleChange} className={inputClass} placeholder="EAAxxxx..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className={labelClass}>Phone Number ID</label>
                <input name="metaPhoneNumberId" value={formData.metaPhoneNumberId} onChange={handleChange} className={inputClass} placeholder="1234567890" />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>WABA ID</label>
                <input name="metaWabaId" value={formData.metaWabaId} onChange={handleChange} className={inputClass} placeholder="1234567890" />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Webhook Verify Token</label>
                <input name="metaVerifyToken" value={formData.metaVerifyToken} onChange={handleChange} className={inputClass} placeholder="secure_verify_token" />
              </div>
            </div>
          </div>
	        </div>

          {/* Display Names */}
          <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Type className="text-indigo-600" size={18} />
                <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wide">Display Names (AppSheet-like)</h3>
              </div>
              <button
                type="button"
                onClick={() => { setViewRows([]); setFieldRows([]); setIsSaved(false); }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                title="Clear all overrides"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>

            <div className="p-6 space-y-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs font-black text-indigo-700 uppercase tracking-widest">View Labels</div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        value={viewSearch}
                        onChange={(e) => setViewSearch(e.target.value)}
                        placeholder="Search…"
                        className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewRows(prev => [...prev, { id: makeId(), key: '', label: '' }])}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3 font-bold">Key (view id)</th>
                        <th className="text-left px-4 py-3 font-bold">Display Name</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewRows
                        .filter(r => {
                          const q = viewSearch.trim().toLowerCase();
                          if (!q) return true;
                          return r.key.toLowerCase().includes(q) || r.label.toLowerCase().includes(q);
                        })
                        .map((row) => (
                          <tr key={row.id} className="border-t border-gray-100">
                            <td className="px-4 py-2">
                              <input
                                value={row.key}
                                onChange={(e) => setViewRows(prev => prev.map(r => r.id === row.id ? { ...r, key: e.target.value } : r))}
                                placeholder="e.g. statuses"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                value={row.label}
                                onChange={(e) => setViewRows(prev => prev.map(r => r.id === row.id ? { ...r, label: e.target.value } : r))}
                                placeholder="e.g. Work Status"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => setViewRows(prev => prev.filter(r => r.id !== row.id))}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      {viewRows.length === 0 && (
                        <tr>
                          <td className="px-4 py-4 text-gray-500" colSpan={3}>No overrides. Click Add to create one.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs font-black text-indigo-700 uppercase tracking-widest">Field Labels</div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        value={fieldSearch}
                        onChange={(e) => setFieldSearch(e.target.value)}
                        placeholder="Search…"
                        className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFieldRows(prev => [...prev, { id: makeId(), key: '', label: '' }])}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3 font-bold">Key (fieldKey)</th>
                        <th className="text-left px-4 py-3 font-bold">Display Name</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldRows
                        .filter(r => {
                          const q = fieldSearch.trim().toLowerCase();
                          if (!q) return true;
                          return r.key.toLowerCase().includes(q) || r.label.toLowerCase().includes(q);
                        })
                        .map((row) => (
                          <tr key={row.id} className="border-t border-gray-100">
                            <td className="px-4 py-2">
                              <input
                                value={row.key}
                                onChange={(e) => setFieldRows(prev => prev.map(r => r.id === row.id ? { ...r, key: e.target.value } : r))}
                                placeholder="e.g. task.remarks"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                value={row.label}
                                onChange={(e) => setFieldRows(prev => prev.map(r => r.id === row.id ? { ...r, label: e.target.value } : r))}
                                placeholder="e.g. Notes"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => setFieldRows(prev => prev.filter(r => r.id !== row.id))}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      {fieldRows.length === 0 && (
                        <tr>
                          <td className="px-4 py-4 text-gray-500" colSpan={3}>No overrides. Click Add to create one.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Examples: view id <code className="font-mono">statuses</code> → “Work Status”, fieldKey <code className="font-mono">task.remarks</code> → “Notes”.
              </div>
            </div>
          </div>

	        <div className="flex justify-end pt-4">
          {saveError && (
            <span className="mr-3 px-3 py-2 bg-red-100 text-red-700 rounded text-sm font-medium">
              {saveError}
            </span>
          )}
          <button 
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md font-bold text-sm uppercase tracking-wide"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? 'Saving...' : 'Save All Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
