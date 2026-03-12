import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  clearTestOtpStore,
  consumeTestOtp,
  getLatestTestOtp,
  isTestOtpStoreEnabled,
  recordTestOtp,
} from './test-otp-store';

describe('test otp store', () => {
  beforeEach(() => {
    clearTestOtpStore();
    vi.useRealTimers();
  });

  test('stores and returns latest otp by email', () => {
    expect(isTestOtpStoreEnabled()).toBe(true);

    recordTestOtp({ email: 'User@example.com', otp: '123456', type: 'sign-in' });
    recordTestOtp({ email: 'user@example.com', otp: '654321', type: 'sign-in' });

    const latest = getLatestTestOtp({ email: 'user@example.com' });
    expect(latest?.otp).toBe('654321');
    expect(latest?.email).toBe('user@example.com');
  });

  test('filters by type when requested', () => {
    recordTestOtp({ email: 'user@example.com', otp: '123456', type: 'sign-in' });
    recordTestOtp({ email: 'user@example.com', otp: '999999', type: 'forget-password' });

    const signIn = getLatestTestOtp({ email: 'user@example.com', type: 'sign-in' });
    const forgot = getLatestTestOtp({ email: 'user@example.com', type: 'forget-password' });
    expect(signIn?.otp).toBe('123456');
    expect(forgot?.otp).toBe('999999');
  });

  test('expires otp entries by ttl', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T00:00:00.000Z'));
    recordTestOtp({ email: 'user@example.com', otp: '123456', type: 'sign-in' });

    vi.advanceTimersByTime(301_000);
    const latest = getLatestTestOtp({ email: 'user@example.com' });
    expect(latest).toBeNull();
  });

  test('marks otp as replayed after first successful consume', () => {
    recordTestOtp({ email: 'user@example.com', otp: '123456', type: 'sign-in' });

    expect(
      consumeTestOtp({ email: 'user@example.com', otp: '123456', type: 'sign-in' }).status,
    ).toBe('consumed');
    expect(
      consumeTestOtp({ email: 'user@example.com', otp: '123456', type: 'sign-in' }).status,
    ).toBe('replayed');
  });
});
