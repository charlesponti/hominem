// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useEmailAuth } from '~/services/auth/use-email-auth';

function setup(overrides: Partial<Parameters<typeof useEmailAuth>[0]> = {}) {
  const ops = {
    verifyOtp: vi.fn().mockResolvedValue(undefined),
    resendOtp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const rendered = renderHook(() => useEmailAuth(ops));
  return { ops, ...rendered };
}

describe('useEmailAuth', () => {
  it('verifies the OTP using the given email and otp state', async () => {
    const { ops, result } = setup();

    act(() => {
      result.current.setOtp('123456');
    });

    await act(async () => {
      await result.current.handleVerifyOtp('user@example.com');
    });

    expect(ops.verifyOtp).toHaveBeenCalledWith('user@example.com', '123456');
  });

  it('requires both email and otp before verifying', async () => {
    const { ops, result } = setup();

    await act(async () => {
      await result.current.handleVerifyOtp('user@example.com');
    });

    expect(ops.verifyOtp).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Verification code is required');
  });

  it('sets a validation error and skips the call when the email is empty', async () => {
    const { ops, result } = setup();

    act(() => {
      result.current.setOtp('123456');
    });

    await act(async () => {
      await result.current.handleVerifyOtp('');
    });

    expect(ops.verifyOtp).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Email is required');
  });

  it('clears the otp when verification fails', async () => {
    const { result } = setup({
      verifyOtp: vi.fn().mockRejectedValue(new Error('Invalid code')),
    });

    act(() => {
      result.current.setOtp('123456');
    });

    await act(async () => {
      await result.current.handleVerifyOtp('user@example.com');
    });

    expect(result.current.error).toBe('Invalid code');
    expect(result.current.otp).toBe('');
  });

  it('falls back to a generic error message for a non-Error rejection', async () => {
    const { result } = setup({ verifyOtp: vi.fn().mockRejectedValue('nope') });

    act(() => {
      result.current.setOtp('123456');
    });

    await act(async () => {
      await result.current.handleVerifyOtp('user@example.com');
    });

    expect(result.current.error).toBe('Authentication failed. Please try again.');
  });

  it('resends the OTP, clears otp on success, and tracks isResending separately from isSubmitting', async () => {
    const { ops, result } = setup();

    act(() => {
      result.current.setOtp('123456');
    });

    await act(async () => {
      await result.current.handleResendOtp('user@example.com');
    });

    expect(ops.resendOtp).toHaveBeenCalledWith('user@example.com');
    expect(result.current.otp).toBe('');
    expect(result.current.isResending).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('sets a validation error when resending without an email', async () => {
    const { ops, result } = setup();

    await act(async () => {
      await result.current.handleResendOtp('');
    });

    expect(ops.resendOtp).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Email is required');
  });
});
