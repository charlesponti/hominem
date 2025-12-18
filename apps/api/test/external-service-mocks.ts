import { vi } from "vitest";

/**
 * Plaid service mocks
 */
export const createPlaidMocks = () => {
  const plaidClient = {
    linkTokenCreate: vi.fn(),
    itemPublicTokenExchange: vi.fn(),
    itemRemove: vi.fn(),
    accountsGet: vi.fn(),
    transactionsGet: vi.fn(),
    institutionsGetById: vi.fn(),
  };

  const verifyPlaidWebhookSignature = vi.fn();

  const mockPlaidLib = () => {
    vi.mock("../../src/lib/plaid.js", () => ({
      plaidClient,
      verifyPlaidWebhookSignature,
      PLAID_COUNTRY_CODES: ["US"],
      PLAID_PRODUCTS: ["transactions"],
    }));
  };

  return {
    plaidClient,
    verifyPlaidWebhookSignature,
    mockPlaidLib,
  };
};

/**
 * Stripe service mocks
 */
export const createStripeMocks = () => {
  const stripe = {
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      del: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
    },
    paymentMethods: {
      attach: vi.fn(),
      detach: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };

  const mockStripeLib = () => {
    vi.mock("stripe", () => ({
      default: vi.fn(() => stripe),
    }));
  };

  return {
    stripe,
    mockStripeLib,
  };
};

/**
 * OpenAI service mocks
 */
export const createOpenAIMocks = () => {
  const openai = {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
    embeddings: {
      create: vi.fn(),
    },
  };

  const mockOpenAILib = () => {
    vi.mock("openai", () => ({
      OpenAI: vi.fn(() => openai),
    }));
  };

  return {
    openai,
    mockOpenAILib,
  };
};

/**
 * Supabase storage service mocks
 */
export const createStorageMocks = () => {
  const storage = {
    storeFile: vi.fn().mockResolvedValue({
      id: "test-id",
      originalName: "test.txt",
      filename: "test-user/test-id.txt",
      mimetype: "application/octet-stream",
      size: 100,
      url: "https://storage.supabase.co/test-bucket/test-id.txt",
      uploadedAt: new Date(),
    }),
    downloadCsvFileAsBuffer: vi
      .fn()
      .mockResolvedValue(Buffer.from("test content")),
    getFile: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
    deleteFile: vi.fn().mockResolvedValue(true),
    getFileUrl: vi
      .fn()
      .mockResolvedValue("https://storage.supabase.co/test-bucket/test-id.txt"),
    getSignedUrl: vi
      .fn()
      .mockResolvedValue("https://storage.supabase.co/signed-url"),
    listUserFiles: vi.fn().mockResolvedValue([]),
  };

  const mockSupabaseStorageLib = () => {
    vi.mock("@hominem/utils/supabase", () => ({
      SupabaseStorageService: vi.fn(() => storage),
      csvStorageService: storage,
      fileStorageService: storage,
    }));
  };

  return {
    storage,
    mockSupabaseStorageLib,
  };
};

/**
 * Email service mocks (Resend)
 */
export const createEmailMocks = () => {
  const send = vi.fn();

  const mockResendLib = () => {
    vi.mock("resend", () => ({
      Resend: vi.fn(() => ({
        emails: { send },
      })),
    }));
  };

  return {
    send,
    mockResendLib,
  };
};

/**
 * Google APIs mocks
 */
export const createGoogleMocks = () => {
  const places = {
    places: {
      get: vi.fn(),
      photos: {
        getMedia: vi.fn(),
      },
      searchText: vi.fn(),
    },
  };

  const auth = {
    GoogleAuth: vi.fn(),
  };

  const mockGoogleLib = () => {
    vi.mock("googleapis", () => ({
      google: {
        auth,
        options: vi.fn(),
        places: vi.fn(() => places),
      },
    }));
  };

  return {
    places,
    auth,
    mockGoogleLib,
  };
};

/**
 * Queue service mocks (Bull/BullMQ)
 */
export const createQueueMocks = () => {
  const queue = {
    add: vi.fn(),
    process: vi.fn(),
    close: vi.fn(() => Promise.resolve()),
    getJob: vi.fn(),
    getJobs: vi.fn(),
    clean: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };

  const mockBullLib = () => {
    vi.mock("bull", () => ({
      default: vi.fn(() => queue),
    }));
  };

  const mockBullMQLib = () => {
    vi.mock("bullmq", () => ({
      Queue: vi.fn(() => queue),
      Worker: vi.fn(),
    }));
  };

  return {
    queue,
    mockBullLib,
    mockBullMQLib,
  };
};

/**
 * All external service mocks
 */
export const setupAllExternalMocks = () => {
  const plaid = createPlaidMocks();
  const stripe = createStripeMocks();
  const openai = createOpenAIMocks();
  const storage = createStorageMocks();
  const email = createEmailMocks();
  const google = createGoogleMocks();
  const queues = createQueueMocks();

  // Setup all mocks
  plaid.mockPlaidLib();
  stripe.mockStripeLib();
  openai.mockOpenAILib();
  storage.mockSupabaseStorageLib();
  email.mockResendLib();
  google.mockGoogleLib();
  queues.mockBullLib();

  return {
    plaid,
    stripe,
    openai,
    storage,
    email,
    google,
    queues,
  };
};
