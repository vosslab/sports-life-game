// eslint.config.js - flat config for ESLint 10+
// Lints compiled JS output in dist/
// TypeScript-specific checks (unused vars, implicit any, strict types)
// are handled by tsc --strict via tsconfig.json

export default [
  {
    files: ['dist/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    rules: {
      // Catch real bugs
      'no-constant-condition': 'warn',
      'no-unreachable': 'error',
      'no-duplicate-case': 'error',
      'no-fallthrough': 'warn',
      'no-self-assign': 'error',
      'no-self-compare': 'error',

      // Prevent common mistakes
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',

      // Do not enforce cosmetic rules (Prettier owns formatting)
    },
  },
  {
    ignores: ['node_modules/', 'OTHER_REPOS_FOR_STUDY/'],
  },
];
