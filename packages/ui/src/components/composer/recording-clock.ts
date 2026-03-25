/**
 * RecordingClock
 *
 * A plain JS timer that tracks elapsed recording time.
 * Implements the useSyncExternalStore interface so components subscribe
 * with zero useEffect — the interval runs entirely outside React.
 *
 * Usage:
 *   const clock = useMemo(() => new RecordingClock(), [])
 *   const elapsed = useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getServerSnapshot)
 *   // Start/stop from event handlers — not effects
 *   clock.start()
 *   clock.stop()
 */

export class RecordingClock {
  #startedAt: number | null = null;
  #elapsed = 0;
  #timer: ReturnType<typeof setInterval> | null = null;
  readonly #listeners = new Set<() => void>();

  start(): void {
    if (this.#timer) clearInterval(this.#timer);
    this.#startedAt = Date.now();
    this.#elapsed = 0;
    this.#timer = setInterval(() => {
      if (this.#startedAt === null) return;
      this.#elapsed = Date.now() - this.#startedAt;
      this.#notify();
    }, 250);
  }

  stop(): void {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    this.#startedAt = null;
    this.#elapsed = 0;
    this.#notify();
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }

  // useSyncExternalStore interface
  getSnapshot = (): number => this.#elapsed;
  getServerSnapshot = (): number => 0;
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Format elapsed ms as MM:SS */
  static format(ms: number): string {
    const m = Math.floor(ms / 60000)
      .toString()
      .padStart(2, '0');
    const s = Math.floor((ms % 60000) / 1000)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }
}
