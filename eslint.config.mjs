import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    // The Vercel Build Output API tree: a whole copy of dist/ plus the runtime
    // node_modules the SSR function carries. Linting it produced 5,335
    // warnings about vendored code the moment anyone ran the Vercel build
    // locally, which is now the normal thing to do.
    '.vercel/**',
    'node_modules/**',
    '.git/**',
    '.wrangler/**',
    '.vinext/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
