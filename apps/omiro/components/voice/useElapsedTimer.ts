import { useEffect, useState } from 'react';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Ticks off a fixed `startedAt` timestamp (not a local counter) so the
// elapsed time stays correct even if the panel showing it remounts mid-recording.
export function useElapsedTimer(startedAt: number | null): string {
  const [prevStartedAt, setPrevStartedAt] = useState(startedAt);
  const [elapsedMs, setElapsedMs] = useState(0);

  if (startedAt !== prevStartedAt) {
    setPrevStartedAt(startedAt);
    setElapsedMs(0);
  }

  useEffect(() => {
    if (startedAt === null) return;

    const interval = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (startedAt === null) return '0:00';
  return formatElapsed(elapsedMs);
}
