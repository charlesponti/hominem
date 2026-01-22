import type { ReactElement, ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, type RenderResult, render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { vi } from 'vitest';

import { TEST_USER_EMAIL, TEST_USER_NAME, USER_ID } from './mocks';

export interface MockQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
}

const mockSupabaseUser = {
  id: USER_ID,
  email: TEST_USER_EMAIL,
  user_metadata: {
    name: TEST_USER_NAME,
    full_name: TEST_USER_NAME,
    first_name: 'Test',
    last_name: 'User',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockSupabaseUser,
};

vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: mockSession } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: mockSupabaseUser } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: mockSession } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: mockSupabaseUser } }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
};

const mockAuthContextValue = {
  user: mockSupabaseUser,
  session: mockSession,
  isAuthenticated: true,
  isLoading: false,
  supabase: mockSupabaseClient,
  logout: vi.fn(),
  signIn: vi.fn(),
  userId: USER_ID,
};

vi.mock('@hominem/auth', () => ({
  SupabaseAuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useSupabaseAuth: () => mockAuthContextValue,
  useSupabaseAuthContext: () => mockAuthContextValue,
  getSupabase: () => mockSupabaseClient,
  UserAuthService: {
    findByIdOrEmail: vi.fn(async (opts) => {
      const id = opts.id || opts.supabaseId;
      return {
        id: id,
        supabaseId: id,
        email: `test-${id}@example.com`,
        name: 'Test User',
        image: null,
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }),
  },
}));

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export interface MockMutationResult<TData = unknown> {
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  data: TData | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  isPending: boolean;
  reset: ReturnType<typeof vi.fn>;
}

type UseMutationFn<TData = unknown> = ReturnType<typeof vi.fn<() => MockMutationResult<TData>>>;

function createUseMutationQuery<TData = unknown>(): UseMutationFn<TData> {
  const defaultResult: MockMutationResult<TData> = {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    data: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    isPending: false,
    reset: vi.fn(),
  };
  return vi.fn<() => MockMutationResult<TData>>(() => defaultResult);
}

function createUseQuery() {
  return {
    data: null,
    isLoading: false,
    error: null,
    invalidate: vi.fn(),
    refetch: vi.fn(),
    setData: vi.fn(),
  };
}

const mockTrpcClient = {
  useUtils: vi.fn(() => ({
    lists: {
      getAll: createUseQuery(),
      getById: createUseQuery(),
    },
    places: {
      getAll: createUseQuery(),
      getById: createUseQuery(),
      getNearbyFromLists: createUseQuery(),
    },
  })),
  lists: {
    getAll: { useQuery: vi.fn() },
    getById: { useQuery: vi.fn() },
    create: { useMutation: createUseMutationQuery() },
    update: { useMutation: createUseMutationQuery() },
    delete: { useMutation: createUseMutationQuery() },
  },
  places: {
    getAll: { useQuery: vi.fn() },
    getById: { useQuery: vi.fn() },
    getNearbyFromLists: { useQuery: vi.fn() },
    autocomplete: { useQuery: vi.fn() },
    create: { useMutation: createUseMutationQuery() },
    update: { useMutation: createUseMutationQuery() },
    delete: { useMutation: createUseMutationQuery() },
  },
  items: {
    getByListId: { useQuery: vi.fn() },
    addToList: { useMutation: createUseMutationQuery() },
    removeFromList: { useMutation: createUseMutationQuery() },
  },
  invites: {
    getAll: { useQuery: vi.fn() },
    getByList: { useQuery: vi.fn() },
    create: { useMutation: vi.fn() },
    accept: { useMutation: vi.fn() },
    decline: { useMutation: vi.fn() },
  },
  user: {
    deleteAccount: { useMutation: vi.fn() },
  },
} as const;

vi.mock('~/lib/trpc/client', () => ({
  trpc: mockTrpcClient,
}));

const MockTRPCProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

vi.mock('~/lib/trpc/provider', () => ({
  TRPCProvider: MockTRPCProvider,
}));

export { mockTrpcClient };

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
  }: {
    queryClient?: QueryClient;
  } = {},
  options: RenderOptions = {},
): RenderResult {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>, options);
}

type RouteStubs = Parameters<typeof createRoutesStub>[0];
export type RouteComponentType = RouteStubs[number]['Component'];

export function renderWithRouter(
  config: {
    routes: RouteStubs;
    isAuth?: boolean;
    initialEntries?: string[];
  },
  {
    queryClient = createTestQueryClient(),
  }: {
    queryClient?: QueryClient;
  } = {},
): RenderResult {
  const Stub = createRoutesStub(config.routes);

  return render(
    <QueryClientProvider client={queryClient}>
      <Stub initialEntries={config.initialEntries || ['/']} />
    </QueryClientProvider>,
  );
}

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as typeof globalThis).ResizeObserver = ResizeObserver;
