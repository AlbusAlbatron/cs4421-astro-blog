import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';

export default tseslint.config(
  {
    ignores: ['dist/', '.astro/', 'node_modules/', 'cdk/cdk.out/', 'cdk/node_modules/'],
  },

  {
    files: ['cdk/jest.config.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
      },
    },
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs['jsx-a11y-recommended'],
);
