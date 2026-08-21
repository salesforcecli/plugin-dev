import tsconfigs from 'eslint-config-salesforce-typescript';
import plugin from 'eslint-plugin-sf-plugin';

const configs = [
  {
    ignores: ['*.cjs', 'test/fixtures'],
  },
  ...tsconfigs,
  ...plugin.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];

export default configs;
