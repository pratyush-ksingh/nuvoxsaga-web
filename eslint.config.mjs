import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import security from 'eslint-plugin-security';
import noSecrets from 'eslint-plugin-no-secrets';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Security plugins — applied to all source files.
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    plugins: { security, 'no-secrets': noSecrets },
    rules: {
      // eslint-plugin-security recommended set
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-unsafe-regex': 'error',

      // eslint-plugin-no-secrets — fail on entropy-detected secret-shaped strings
      'no-secrets/no-secrets': ['error', { tolerance: 4.5 }],
    },
  },

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'tokens/build/**', // codegen output
    '.wrangler/**', // wrangler pages dev build output
  ]),
]);

export default eslintConfig;
