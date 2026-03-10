jest.mock('react-native-safe-area-context', () => {
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  }
})
