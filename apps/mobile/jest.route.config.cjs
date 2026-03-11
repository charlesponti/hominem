const preset = require('jest-expo/jest-preset')

module.exports = {
  ...preset,
  testMatch: ['<rootDir>/tests/routes/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/screens/jest.setup.ts'],
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^~/(.*)$': '<rootDir>/$1',
    '^theme$': '<rootDir>/theme',
  },
  transformIgnorePatterns: preset.transformIgnorePatterns.map((pattern) =>
    pattern.replace('.pnpm|react-native', '.pnpm|.bun|react-native|@hominem')
  ),
}
