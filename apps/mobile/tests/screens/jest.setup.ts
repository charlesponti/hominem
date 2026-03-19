const { StyleSheet } = require('react-native')
const reactNative = require('react-native')

if (!StyleSheet.flatten) {
  StyleSheet.flatten = (style: unknown) => style
}

if (!reactNative.Platform) {
  reactNative.Platform = {
    OS: 'ios',
    select: (options: Record<string, unknown>) => options.ios ?? options.default,
  }
}

jest.mock('react-native-safe-area-context', () => {
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    }),
  }
})

jest.mock('expo-image', () => {
  const React = require('react')
  const { View } = require('react-native')

  return {
    Image: ({ testID }: { testID?: string }) => React.createElement(View, { testID }),
  }
})
