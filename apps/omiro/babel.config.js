module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // React Compiler 1.x can't handle our native/Reanimated callbacks
          // and async finalizers yet, so stick with manual memoization for now.
          reactCompiler: false,
          lazyImports: true,
        },
      ],
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
