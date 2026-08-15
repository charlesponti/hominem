// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useEmailAuth } from '~/services/auth/use-email-auth';

function setup(overrides: Partial<Parameters<typeof useEmailAuth>[0]> = {}) {
  const ops = {
    sendOtp: vi.fn().mockResolvedValue(undefined),
    verifyOtp: vi.fn().mockResolvedValue(undefined),
    resendOtp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const rendered = renderHook(() => useEmailAuth(ops));
  return { ops, ...rendered };
}

describe('useEmailAuth', () => {
  it('sends an OTP for the email entered via setEmail', async () => {
    const { ops, result } = setup();

    act(() => {
      result.current.setEmail('user@example.com');
    });

    await act(async () => {
      await result.current.handleSendOtp();
    });

    expect(ops.sendOtp).toHaveBeenCalledWith('user@example.com');
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('accepts an email override without requiring setEmail first', async () => {
    const { ops, result } = setup();

    await act(async () => {
      await result.current.handleSendOtp('override@example.com');
    });

    expect(ops.sendOtp).toHaveBeenCalledWith('override@example.com');
  });

  it('sets a validation error and skips the call when the email is empty', async () => {
    const { ops, result } = setup();

    await act(async () => {
      await result.current.handleSendOtp();
    });

    expect(ops.sendOtp).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Email is required');
  });

  it('surfaces the operation error message when sendOtp rejects', async () => {
    const { result } = setup({ sendOtp: vi.fn().mockRejectedValue(new Error('Rate limited')) });

    act(() => {
      result.current.setEmail('user@example.com');
    });

    await act(async () => {
      await result.current.handleSendOtp();
    });

    expect(result.current.error).toBe('Rate limited');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('falls back to a generic error message for a non-Error rejection', async () => {
    const { result } = setup({ sendOtp: vi.fn().mockRejectedValue('nope') });

    act(() => {
      result.current.setEmail('user@example.com');
    });

    await act(async () => {
      await result.current.handleSendOtp();
    });

    expect(result.current.error).toBe('Authentication failed. Please try again.');
  });

  it('verifies the OTP using the current email and otp state', async () => {
    const { ops, result } = setup();

    act(() => {
      result.current.setEmail('user@example.com');
      result.current.setOtp('123456');
    });

    await act(async () => {
      await result.current.handleVerifyOtp();
    });

    expect(ops.verifyOtp).toHaveBeenCalledWith('user@example.com', '123456');
  });

  it('requires both email and otp before verifying', async () => {
    const { ops, result } = setup();

    act(() => {
      result.current.setEmail('user@example.com');
    });

    await act(async () => {
      await result.current.handleVerifyOtp();
    });

    expect(ops.verifyOtp).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Verification code is required');
  });

  it('clears the otp when verification fails', async () => {
    const { result } = setup({
      verifyOtp: vi.fn().mockRejectedValue(new Error('Invalid code')),
    });

    act(() => {
      result.current.setEmail('user@example.com');
      result.current.setOtp('123456');
    });

    await act(async () => {
      await result.current.handleVerifyOtp();
    });

    expect(result.current.error).toBe('Invalid code');
    expect(result.current.otp).toBe('');
  });

  it('resends the OTP, clears otp on success, and tracks isResending separately from isSubmitting', async () => {
    const { ops, result } = setup();

    act(() => {
      result.current.setEmail('user@example.com');
      result.current.setOtp('123456');
    });

    await act(async () => {
      await result.current.handleResendOtp();
    });

    expect(ops.resendOtp).toHaveBeenCalledWith('user@example.com');
    expect(result.current.otp).toBe('');
    expect(result.current.isResending).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('sets a validation error when resending without an email', async () => {
    const { ops, result } = setup();

    await act(async () => {
      await result.current.handleResendOtp();
    });

    expect(ops.resendOtp).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Email is required');
  });
});
