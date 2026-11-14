import { defineConfig, globalIgnores } from 'eslint/config';
import hooks from 'eslint-plugin-react-hooks';
import typescript from 'eslint-config-next/typescript';

// Native sources need their own scope: the web ESLint config intentionally ignores native/.
export default defineConfig([
  ...typescript,
  { plugins: { 'react-hooks': hooks }, rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-require-imports': ['error', { allow: ['\\.(png|jpg|jpeg|webp|gif)$'] }],
  } },
  globalIgnores(['node_modules/**', '.expo/**', 'ios/**', 'android/**']),
]);
