// Central stylelint config enforcing VOID constraints
module.exports = {
  defaultSeverity: 'error',
  ignoreFiles: [
    '**/build/**',
    '**/dist/**',
    '**/.next/**',
    '**/out/**',
    '**/coverage/**',
    '**/node_modules/**',
  ],
  rules: {
    'color-no-hex': null,
    'color-named': 'never',
    'declaration-no-important': null,
    'declaration-property-value-disallowed-list': {
      'box-shadow': [/./],
      'backdrop-filter': [/./],
      background: [/gradient/i],
      'background-image': [/gradient/i],
      'border-radius': [/./],
    },
    'function-disallowed-list': ['linear-gradient', 'radial-gradient', 'conic-gradient'],
    'at-rule-disallowed-list': ['keyframes'],
    'font-family-no-missing-generic-family-keyword': true,
    'font-family-name-quotes': 'always-unless-keyword',
    'property-disallowed-list': ['border-radius', 'box-shadow', 'backdrop-filter'],
    'selector-disallowed-list': ['::-webkit-scrollbar', '::scrollbar'],
  },
  overrides: [
    {
      files: ['**/animations.css'],
      rules: {
        'at-rule-disallowed-list': [],
        'declaration-property-value-disallowed-list': {},
        'property-disallowed-list': [],
        'function-disallowed-list': [],
      },
    },
    {
      files: ['**/packages/ui/src/styles/**/*.css'],
      rules: {
        'color-no-hex': null,
      },
    },
    {
      files: ['**/packages/ui/src/styles/globals.css'],
      rules: {
        'declaration-property-value-disallowed-list': {},
        'property-disallowed-list': [],
        'color-no-hex': null,
        'function-disallowed-list': [],
        'at-rule-disallowed-list': [],
      },
    },
    {
      files: ['**/packages/ui/src/components/ui/*.css'],
      rules: {
        'color-no-hex': null,
        'declaration-property-value-disallowed-list': null,
        'property-disallowed-list': {
          'box-shadow': [/./],
        },
      },
    },
  ],
};
