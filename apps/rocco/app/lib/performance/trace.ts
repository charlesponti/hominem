export type TraceTags = Record<string, string | number | boolean | undefined>;

export type TraceEntry = {
  name: string;
  start: number;
  duration: number;
  tags?: TraceTags;
};

type TraceHandle = {
  name: string;
  start: number;
  tags?: TraceTags;
};

const MAX_TRACE_ENTRIES = 200;
const traces: TraceEntry[] = [];

const getNow = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const isDev = typeof import.meta !== 'undefined' ? !!import.meta.env?.DEV : false;

export const startTrace = (name: string, tags: TraceTags): TraceHandle => ({
  name,
  start: getNow(),
  tags,
});

export const endTrace = (handle: TraceHandle | null | undefined, extraTags?: TraceTags) => {
  if (!handle) {
    return;
  }

  const entry: TraceEntry = {
    name: handle.name,
    start: handle.start,
    duration: getNow() - handle.start,
    tags: { ...handle.tags, ...extraTags },
  };

  traces.push(entry);
  if (traces.length > MAX_TRACE_ENTRIES) {
    traces.shift();
  }

  if (isDev) {
    console.debug('[rocco-perf]', entry.name, `${entry.duration.toFixed(1)}ms`, entry.tags);
  }
};

export const getTraceEntries = () => traces.slice();

export const clearTraceEntries = () => {
  traces.length = 0;
};
