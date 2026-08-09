import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { createTimePreviewScenarios, type TimePreviewScenario } from './time-preview-scenarios';

interface TimePreviewContextValue {
  scenario: TimePreviewScenario | null;
  scenarios: TimePreviewScenario[];
  setScenarioId: (id: string | null) => void;
}

const noop = () => {};
const defaultValue: TimePreviewContextValue = {
  scenario: null,
  scenarios: createTimePreviewScenarios(),
  setScenarioId: noop,
};

const TimePreviewContext = createContext<TimePreviewContextValue>(defaultValue);

export function TimePreviewProvider({ children }: { children: ReactNode }) {
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const scenarios = useMemo(() => createTimePreviewScenarios(), []);
  const scenario = useMemo(
    () => scenarios.find((candidate) => candidate.id === scenarioId) ?? null,
    [scenarioId, scenarios],
  );
  const value = useMemo(() => ({ scenario, scenarios, setScenarioId }), [scenario, scenarios]);

  return <TimePreviewContext.Provider value={value}>{children}</TimePreviewContext.Provider>;
}

export function useTimePreview() {
  return useContext(TimePreviewContext);
}
