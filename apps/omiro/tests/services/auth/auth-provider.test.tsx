// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockUseSession = vi.fn();
const mockGetCookie = vi.fn();
const mockAuthSignOut = vi.fn();
const mockSendVerificationOtp = vi.fn();
const mockSignInEmailOtp = vi.fn();
const mockUpdateUser = vi.fn();
const mockClearLegacyDataOnce = vi.fn().mockResolvedValue(undefined);
const mockQueryClientClear = vi.fn();
const mockClearPersistedQueryCache = vi.fn().mockResolvedValue(undefined);
const mockClearAllData = vi.fn().mockResolvedValue(undefined);
const mockCaptureEvent = vi.fn();
const mockCaptureFailure = vi.fn();

const { mockConstants } = vi.hoisted(() => ({ mockConstants: { E2E_TESTING: false } }));

vi.mock('~/constants', () => ({
  get E2E_TESTING() {
    return mockConstants.E2E_TESTING;
  },
}));

vi.mock('~/services/auth/auth-client', () => ({
  authClient: {
    useSession: mockUseSession,
    getCookie: mockGetCookie,
    signOut: mockAuthSignOut,
    emailOtp: { sendVerificationOtp: mockSendVerificationOtp },
    signIn: { emailOtp: mockSignInEmailOtp },
    updateUser: mockUpdateUser,
  },
}));

vi.mock('~/services/auth/boot-legacy-data', () => ({
  clearLegacyDataOnce: mockClearLegacyDataOnce,
}));

vi.mock('~/services/query-client', () => ({
  default: { clear: mockQueryClientClear },
}));

vi.mock('~/services/query-persistence', () => ({
  clearPersistedQueryCache: mockClearPersistedQueryCache,
}));

vi.mock('~/services/storage/local-store', () => ({
  LocalStore: { clearAllData: mockClearAllData },
}));

vi.mock('~/services/auth/analytics', () => ({
  captureAuthAnalyticsEvent: mockCaptureEvent,
  captureAuthAnalyticsFailure: mockCaptureFailure,
}));

const { AuthProvider, useAuth } = await import('~/services/auth/auth-provider');

function withProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return { Wrapper, queryClient };
}

function fakeSessionUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    emailVerified: true,
    name: 'Jane Doe',
    image: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AuthProvider / useAuth', () => {
  afterEach(() => {
    mockConstants.E2E_TESTING = false;
    vi.clearAllMocks();
    mockClearLegacyDataOnce.mockResolvedValue(undefined);
    mockClearPersistedQueryCache.mockResolvedValue(undefined);
    mockClearAllData.mockResolvedValue(undefined);
  });

  it('throws when used outside of an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });

  it('reports isPending and no current user while the session is loading', () => {
    mockUseSession.mockReturnValue({ data: undefined, isPending: true });
    const { Wrapper } = withProviders();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.currentUser).toBeNull();
  });

  it('derives currentUser and isSignedIn from a resolved session', () => {
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    const { Wrapper } = withProviders();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.currentUser).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Jane Doe',
      image: null,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    });
  });

  it('reports signed out when the session has no user', () => {
    mockUseSession.mockReturnValue({ data: { user: null }, isPending: false });
    const { Wrapper } = withProviders();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.currentUser).toBeNull();
  });

  it('getAuthHeaders returns the session cookie header from the auth client', async () => {
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    mockGetCookie.mockReturnValue('session=abc123');
    const { Wrapper } = withProviders();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await expect(result.current.getAuthHeaders()).resolves.toEqual({ cookie: 'session=abc123' });
  });

  it('getAuthHeaders returns an empty object when there is no cookie', async () => {
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    mockGetCookie.mockReturnValue(undefined);
    const { Wrapper } = withProviders();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await expect(result.current.getAuthHeaders()).resolves.toEqual({});
  });

  it('flips isSigningOut around signOut and turns isSignedIn false while signing out', async () => {
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    let resolveSignOut: (value: { error: null }) => void = () => {};
    mockAuthSignOut.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );
    const { Wrapper, queryClient } = withProviders();
    const clearSpy = vi.spyOn(queryClient, 'clear');
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    expect(result.current.isSignedIn).toBe(true);

    let signOutPromise: Promise<void> | undefined;
    act(() => {
      signOutPromise = result.current.signOut();
    });

    await waitFor(() => expect(result.current.isSigningOut).toBe(true));
    expect(result.current.isSignedIn).toBe(false);

    await act(async () => {
      resolveSignOut({ error: null });
      await signOutPromise;
    });

    expect(result.current.isSigningOut).toBe(false);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockClearPersistedQueryCache).toHaveBeenCalledTimes(1);
    expect(mockClearAllData).toHaveBeenCalledTimes(1);
  });

  it('resets isSigningOut even when the sign-out request fails', async () => {
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    mockAuthSignOut.mockResolvedValueOnce({ error: { message: 'boom' } });
    const { Wrapper } = withProviders();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.signOut()).rejects.toThrow('boom');
    });

    expect(result.current.isSigningOut).toBe(false);
  });

  it('handleUnauthorized signs out, clears the query client, cache, and local storage', async () => {
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    mockAuthSignOut.mockResolvedValueOnce({ error: null });
    const { Wrapper } = withProviders();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.handleUnauthorized();
    });

    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
    expect(mockClearPersistedQueryCache).toHaveBeenCalledTimes(1);
    expect(mockClearAllData).toHaveBeenCalledTimes(1);
  });

  it('handleUnauthorized swallows a failing sign-out call and still clears local state', async () => {
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    mockAuthSignOut.mockRejectedValueOnce(new Error('network down'));
    const { Wrapper } = withProviders();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.handleUnauthorized()).resolves.toBeUndefined();
    });

    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
    expect(mockClearPersistedQueryCache).toHaveBeenCalledTimes(1);
    expect(mockClearAllData).toHaveBeenCalledTimes(1);
  });

  it('clears legacy local data once on mount', async () => {
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    renderHook(() => useAuth(), { wrapper: withProviders().Wrapper });

    await waitFor(() => expect(mockClearLegacyDataOnce).toHaveBeenCalledTimes(1));
  });

  it('runs the e2e auth reset automatically on mount when E2E_TESTING is enabled', async () => {
    mockConstants.E2E_TESTING = true;
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    mockAuthSignOut.mockResolvedValueOnce({ error: null });
    renderHook(() => useAuth(), { wrapper: withProviders().Wrapper });

    await waitFor(() => expect(mockAuthSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockClearAllData).toHaveBeenCalledTimes(1));
  });

  it('does not run the e2e auth reset when E2E_TESTING is disabled', async () => {
    mockConstants.E2E_TESTING = false;
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    renderHook(() => useAuth(), { wrapper: withProviders().Wrapper });

    await waitFor(() => expect(mockClearLegacyDataOnce).toHaveBeenCalledTimes(1));
    expect(mockAuthSignOut).not.toHaveBeenCalled();
  });

  it('updateProfile delegates to Better Auth updateUser', async () => {
    mockUseSession.mockReturnValue({ data: { user: fakeSessionUser() }, isPending: false });
    mockUpdateUser.mockResolvedValueOnce({ data: { status: true }, error: null });
    const { Wrapper } = withProviders();
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.updateProfile({ name: 'New Name' });
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({ name: 'New Name' });
  });
});
