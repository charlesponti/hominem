module.exports = {
  extends: ['danbriggs5-react', 'plugin:prettier/recommended'],
  parser: 'babel-eslint',
  rules: {
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'no-console': 'off',
  },
}
