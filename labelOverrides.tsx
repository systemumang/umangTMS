import React from 'react';
import { AppSettings } from './types';

export type LabelOverrideMap = Record<string, string>;

const normalizeLabelMap = (value: unknown): LabelOverrideMap => {
  if (!value) return {};

  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return {};
    try {
      const parsed = JSON.parse(s);
      return normalizeLabelMap(parsed);
    } catch {
      return {};
    }
  }

  if (typeof value !== 'object') return {};

  const rec = value as Record<string, unknown>;
  const out: LabelOverrideMap = {};
  for (const key of Object.keys(rec)) {
    const normalizedKey = String(key || '').trim().toLowerCase();
    if (!normalizedKey) continue;
    const raw = rec[key];
    if (typeof raw !== 'string') continue;
    const label = raw.trim();
    if (!label) continue;
    out[normalizedKey] = label;
  }
  return out;
};

export const buildLabelResolvers = (settings: AppSettings | null | undefined) => {
  const viewMap = normalizeLabelMap(settings?.viewLabelOverrides);
  const fieldMap = normalizeLabelMap(settings?.fieldLabelOverrides);

  const getViewLabel = (viewId: string, defaultLabel: string) => {
    const override = viewMap[String(viewId || '').trim().toLowerCase()];
    return override && override.trim() ? override : defaultLabel;
  };

  const getFieldLabel = (fieldKey: string, defaultLabel: string) => {
    const normalized = String(fieldKey || '').trim().toLowerCase();
    const direct = fieldMap[normalized];
    if (direct && direct.trim()) return direct;

    // Convenience fallback for task fields: allow overrides like "category" to apply to "task.category".
    if (normalized.startsWith('task.')) {
      const unscoped = normalized.slice('task.'.length);
      const fallback = fieldMap[unscoped];
      if (fallback && fallback.trim()) return fallback;
    }

	    // Convenience fallback for recurring task fields: allow overrides like "category" to apply to "recurringtask.category".
	    if (normalized.startsWith('recurringtask.')) {
	      const unscoped = normalized.slice('recurringtask.'.length);
	      const fallback = fieldMap[unscoped];
	      if (fallback && fallback.trim()) return fallback;
	    }

	    // Convenience fallback for any label: allow overrides by the default display text itself.
	    // Example: key "category" applies anywhere default label is "Category".
	    const byDefaultText = fieldMap[String(defaultLabel || '').trim().toLowerCase()];
	    if (byDefaultText && byDefaultText.trim()) return byDefaultText;

	    return defaultLabel;
	  };

  return { getViewLabel, getFieldLabel, viewMap, fieldMap };
};

type LabelContextValue = ReturnType<typeof buildLabelResolvers>;

const LabelContext = React.createContext<LabelContextValue>(
  buildLabelResolvers(undefined)
);

export const LabelProvider: React.FC<{ settings: AppSettings | null | undefined; children: React.ReactNode }> = ({ settings, children }) => {
  const value = React.useMemo(() => buildLabelResolvers(settings), [settings]);
  return <LabelContext.Provider value={value}>{children}</LabelContext.Provider>;
};

export const useLabels = () => React.useContext(LabelContext);
