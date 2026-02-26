import { vi, beforeEach } from 'vitest';

// Create local mocks and mock the 'node:fs' module to use them
const readFileSyncMock = vi.fn();
const writeFileSyncMock = vi.fn();

vi.mock('node:fs', () => ({
  readFileSync: (...args) => readFileSyncMock(...args),
  writeFileSync: (...args) => writeFileSyncMock(...args),
}));

// Mock consola used by the converters
vi.mock('consola', () => ({
  consola: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

export { readFileSyncMock, writeFileSyncMock };

// Reset mocks between tests
beforeEach(() => {
  readFileSyncMock.mockReset();
  writeFileSyncMock.mockReset();
});
