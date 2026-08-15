// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockSendVerificationOtp = vi.fn();
const mockSignInEmailOtp = vi.fn();
const mockCaptureEvent = vi.fn();
const mockCaptureFailure = vi.fn();

vi.mock('~/services/auth/auth-client', () => ({
  authClient: {
    emailOtp: { sendVerificationOtp: mockSendVerificationOtp },
    signIn: { emailOtp: mockSignInEmailOtp },
  },
}));

vi.mock('~/services/auth/analytics', () => ({
  captureAuthAnalyticsEvent: mockCaptureEvent,
  captureAuthAnalyticsFailure: mockCaptureFailure,
}));

const { useEmailOtp } = await import('~/services/auth/hooks/use-email-otp');

describe('useEmailOtp', () => {
  describe('requestEmailOtp', () => {
    it('sends a sign-in OTP request and records success', async () => {
      mockSendVerificationOtp.mockResolvedValueOnce({ error: null });
      const { result } = renderHook(() => useEmailOtp());

      await act(async () => {
        await result.current.requestEmailOtp('user@example.com');
      });

      expect(mockSendVerificationOtp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@example.com', type: 'sign-in' }),
      );
      expect(mockCaptureEvent).toHaveBeenCalledWith(
        'auth_email_otp_request_succeeded',
        expect.objectContaining({ email: 'user@example.com' }),
      );
    });

    it('throws and records failure when Better Auth returns an error', async () => {
      mockSendVerificationOtp.mockResolvedValueOnce({ error: { message: 'Rate limited' } });
      const { result } = renderHook(() => useEmailOtp());

      await act(async () => {
        await expect(result.current.requestEmailOtp('user@example.com')).rejects.toThrow(
          'Rate limited',
        );
      });

      expect(mockCaptureFailure).toHaveBeenCalledWith(
        'auth_email_otp_request_failed',
        expect.objectContaining({ email: 'user@example.com' }),
      );
    });

    it('surfaces a timeout-specific message when the request is aborted', async () => {
      mockSendVerificationOtp.mockImplementationOnce(() => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });
      const { result } = renderHook(() => useEmailOtp());

      await act(async () => {
        await expect(result.current.requestEmailOtp('user@example.com')).rejects.toThrow(
          'Request timed out. Please try again.',
        );
      });
    });
  });

  describe('verifyEmailOtp', () => {
    it('verifies the OTP and records success', async () => {
      mockSignInEmailOtp.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      const { result } = renderHook(() => useEmailOtp());

      await act(async () => {
        await result.current.verifyEmailOtp({ email: 'user@example.com', otp: '123456' });
      });

      expect(mockSignInEmailOtp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@example.com', otp: '123456' }),
      );
      expect(mockCaptureEvent).toHaveBeenCalledWith(
        'auth_email_otp_verify_succeeded',
        expect.objectContaining({ email: 'user@example.com' }),
      );
    });

    it('includes the name field only when provided', async () => {
      mockSignInEmailOtp.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      const { result } = renderHook(() => useEmailOtp());

      await act(async () => {
        await result.current.verifyEmailOtp({
          email: 'user@example.com',
          otp: '123456',
          name: 'Jane',
        });
      });

      expect(mockSignInEmailOtp).toHaveBeenCalledWith(expect.objectContaining({ name: 'Jane' }));
    });

    it('throws when the response has no error but also no user id', async () => {
      mockSignInEmailOtp.mockResolvedValueOnce({ data: { user: null }, error: null });
      const { result } = renderHook(() => useEmailOtp());

      await act(async () => {
        await expect(
          result.current.verifyEmailOtp({ email: 'user@example.com', otp: '123456' }),
        ).rejects.toThrow('Verification failed. Please try again.');
      });

      expect(mockCaptureFailure).toHaveBeenCalledWith(
        'auth_email_otp_verify_failed',
        expect.objectContaining({ email: 'user@example.com' }),
      );
    });

    it('throws the server-provided message when verification errors', async () => {
      mockSignInEmailOtp.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid code' },
      });
      const { result } = renderHook(() => useEmailOtp());

      await act(async () => {
        await expect(
          result.current.verifyEmailOtp({ email: 'user@example.com', otp: '000000' }),
        ).rejects.toThrow('Invalid code');
      });
    });
  });
});
