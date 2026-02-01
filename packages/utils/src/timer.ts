import type { Dayjs, QUnitType } from 'dayjs';

import dayjs from 'dayjs';

export interface TimerOptions {
  label?: string;
  onStart?: ((label: string, startTime: Dayjs) => void) | undefined;
  onStop?: ((label: string, duration: number) => void) | undefined;
}

export class Timer {
  private startTime: Dayjs;
  private label: string;
  private onStart?: ((label: string, startTime: Dayjs) => void) | undefined;
  private onStop?: ((label: string, duration: number) => void) | undefined;

  constructor(options: TimerOptions = {}) {
    this.startTime = dayjs();
    this.label = options.label || 'default';
    this.onStart = options.onStart;
    this.onStop = options.onStop;

    if (this.onStart) {
      this.onStart(this.label, this.startTime);
    }
  }

  stop() {
    const duration = this.getDuration();
    if (this.onStop) {
      this.onStop(this.label, duration);
    }
    return duration;
  }

  getDuration(unit: QUnitType = 'milliseconds') {
    return dayjs().diff(this.startTime, unit);
  }

  reset(): Timer {
    this.startTime = dayjs();
    return this;
  }

  getStartTime(): Dayjs {
    return this.startTime;
  }
}
