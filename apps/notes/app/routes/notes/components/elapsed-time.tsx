import { useEffect, useState } from 'react';

// Helper function to format seconds into HH:MM:SS or MM:SS
function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }
  return `${formattedMinutes}:${formattedSeconds}`;
}

type ElapsedTimeProps = {
  startTimeIso: string | undefined | null;
  status: string | undefined;
  initialDurationMs?: number; // Duration already logged for the task before this timing session
};

export function ElapsedTime({ startTimeIso, status, initialDurationMs = 0 }: ElapsedTimeProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (status === 'in-progress' && startTimeIso) {
      const calculateAndUpdateElapsedTime = () => {
        const startTime = new Date(startTimeIso).getTime();
        const now = Date.now();
        const currentSessionMs = now - startTime;
        const totalElapsedMs = initialDurationMs + currentSessionMs;
        setElapsedSeconds(Math.floor(totalElapsedMs / 1000));
      };

      calculateAndUpdateElapsedTime(); // Initial calculation
      intervalId = setInterval(calculateAndUpdateElapsedTime, 1000);
    } else {
      // If not in-progress, display the initial duration (converted to seconds)
      // or 0 if no initial duration
      setElapsedSeconds(Math.floor(initialDurationMs / 1000));
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [startTimeIso, status, initialDurationMs]);

  if (status !== 'in-progress' && elapsedSeconds === 0) {
    return null; // Don't show anything if not timing and no prior duration
  }

  return (
    <span className="ml-2 text-xs font-mono text-slate-500 dark:text-slate-400">
      {formatTime(elapsedSeconds)}
    </span>
  );
}
