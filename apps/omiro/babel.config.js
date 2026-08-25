module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Omiro uses native/Reanimated callbacks and async finalizers that
          // React Compiler 1.x cannot lower. Keep the existing explicit
          // memoization semantics until the Expo compiler supports them.
          reactCompiler: false,
          lazyImports: true,
        },
      ],
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
