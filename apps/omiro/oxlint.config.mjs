import { defineConfig } from 'oxlint';
import native from 'oxlint-config-universe/native';

export default defineConfig({
  extends: [native],
  rules: {
    'typescript/consistent-type-assertions': ['warn', { assertionStyle: 'never' }],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@hominem/db', '@hominem/db/*'],
            message:
              'Mobile must not import persistence internals directly. Use RPC or domain-facing abstractions instead.',
          },
          {
            group: ['@hominem/services', '@hominem/services/*'],
            message:
              'Mobile must not import server-side services directly. Use transport-safe abstractions instead.',
          },
          {
            group: ['expo-blur', 'expo-blur/*'],
            message:
              'expo-blur is not part of the approved mobile design system. Use the approved blur/overlay primitives instead.',
          },
          {
            group: [
              'expo-linear-gradient',
              'expo-linear-gradient/*',
              'react-native-linear-gradient',
              'react-native-linear-gradient/*',
            ],
            message:
              'LinearGradient is not part of the approved mobile design system. Use flat color backgrounds instead.',
          },
          {
            group: ['lucide-react-native'],
            message: 'Use Apple SF Symbols on mobile.',
          },
        ],
      },
    ],
  },
});
