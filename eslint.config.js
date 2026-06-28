import love from 'eslint-config-love';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'src/**/love*.js',
    ],
  },
  {
    ...love,
    files: ['**/*.ts', '**/*.js', '**/*.mjs'],
    languageOptions: {
      ...love.languageOptions,
      parserOptions: {
        ...love.languageOptions?.parserOptions,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...love.rules,
      'require-unicode-regexp': ['error', { requireFlag: 'u' }],
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
        },
      ],
    },
  },
];
