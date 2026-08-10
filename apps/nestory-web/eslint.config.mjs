import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

// `next lint` is deprecated (removed in Next 16), so this runs on the ESLint
// CLI directly. FlatCompat is still needed because eslint-config-next is
// eslintrc-shaped — Next's own documented migration path.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals'),
];

export default config;
