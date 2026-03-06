module.exports = {
  testTimeout: 180000,
  testMatch: ['**/*.e2e.js'],
  maxWorkers: 1,
  reporters: ['detox/runners/jest/reporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testEnvironment: 'detox/runners/jest/testEnvironment',
  // Note: maxWorkers: 1 ensures tests run sequentially per Detox architecture
  // Each test file gets its own simulator connection, preventing connection conflicts
}

