import expoConfig from 'eslint-config-expo/flat.js';

export default [
  ...expoConfig,
  {
    ignores: ['dist/**', 'release/**', 'node_modules/**', '.expo/**', 'web-build/**'],
  },
];
