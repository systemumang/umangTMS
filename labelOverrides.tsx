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
    const raw = rec[key];
    if (typeof raw !== 'string') continue;
    const label = raw.trim();
    if (!label) continue;
    out[key] = label;
  }
  return out;
};

export const buildLabelResolvers = (settings: AppSettings | null | undefined) => {
  const viewMap = normalizeLabelMap(settings?.viewLabelOverrides);
  const fieldMap = normalizeLabelMap(settings?.fieldLabelOverrides);

  const getViewLabel = (viewId: string, defaultLabel: string) => {
    const override = viewMap[viewId];
    return override && override.trim() ? override : defaultLabel;
  };

  const getFieldLabel = (fieldKey: string, defaultLabel: string) => {
    const override = fieldMap[fieldKey];
    return override && override.trim() ? override : defaultLabel;
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

