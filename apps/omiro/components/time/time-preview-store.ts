import { useSyncExternalStore } from 'react';

import { createTimePreviewScenarios, type TimePreviewScenario } from './time-preview-scenarios';

interface TimePreviewSnapshot {
  scenario: TimePreviewScenario | null;
  scenarios: TimePreviewScenario[];
}

const scenarios = __DEV__ ? createTimePreviewScenarios() : [];
let snapshot: TimePreviewSnapshot = { scenario: null, scenarios };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function setTimePreviewScenario(id: string | null) {
  const scenario = scenarios.find((candidate) => candidate.id === id) ?? null;
  if (scenario === snapshot.scenario) return;
  snapshot = { scenario, scenarios };
  listeners.forEach((listener) => listener());
}

export function useTimePreview() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...current, setScenarioId: setTimePreviewScenario };
}
