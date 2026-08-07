import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { timePreviewScenarios, type TimePreviewScenario } from './time-preview-scenarios';

interface TimePreviewContextValue {
  scenario: TimePreviewScenario | null;
  scenarios: TimePreviewScenario[];
  setScenarioId: (id: string | null) => void;
}

const noop = () => {};
const defaultValue: TimePreviewContextValue = {
  scenario: null,
  scenarios: timePreviewScenarios,
  setScenarioId: noop,
};

const TimePreviewContext = createContext<TimePreviewContextValue>(defaultValue);

export function TimePreviewProvider({ children }: { children: ReactNode }) {
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const scenario = useMemo(
    () => timePreviewScenarios.find((candidate) => candidate.id === scenarioId) ?? null,
    [scenarioId],
  );
  const value = useMemo(
    () => ({ scenario, scenarios: timePreviewScenarios, setScenarioId }),
    [scenario],
  );

  return <TimePreviewContext.Provider value={value}>{children}</TimePreviewContext.Provider>;
}

export function useTimePreview() {
  return useContext(TimePreviewContext);
}
