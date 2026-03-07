jest.mock('react-native-safe-area-context', () => {
  const React = require('react')
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  }
})
