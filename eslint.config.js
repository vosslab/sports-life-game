// eslint.config.js
// Flat ESM ESLint config for sports-life-game.
//
// Strategy:
// - typescript-eslint v8 ships parser + plugin as one meta-package.
// - .ts files get type-aware lint via projectService (auto-discovers tsconfigs).
// - .mjs files get a minimal base ruleset (no type-aware rules).
// - Ignores cover all generated, archived, and vendored trees.
//
// Rule selection (high signal-to-noise post-async migration):
// - no-floating-promises (from recommendedTypeChecked): catches forgotten await.
// - no-misused-promises (from recommendedTypeChecked): catches promise-in-condition.
// - no-explicit-any: bumped from warn to error; `any` defeats strict mode.
// - consistent-type-imports: enforces `import type` for type-only imports so
//   esbuild can drop them cleanly.

import tseslint from 'typescript-eslint';

export default tseslint.config(
	// Ignore globs
	{
		ignores: ['dist/**', 'node_modules/**', 'archive/**', 'tools/sim_conf/**'],
	},
	// TypeScript source: type-aware rules
	{
		files: ['**/*.ts'],
		extends: [...tseslint.configs.recommendedTypeChecked],
		languageOptions: {
			parserOptions: {
				// Explicit project list so tests/ and tools/ (excluded from
				// tsconfig.json) get linted via tsconfig.lint.json.
				project: ['./tsconfig.json', './tsconfig.lint.json'],
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			// recommendedTypeChecked already enables no-floating-promises and
			// no-misused-promises.
			// Bump no-explicit-any from warn to error.
			'@typescript-eslint/no-explicit-any': 'error',
			// Enforce import type for type-only imports.
			'@typescript-eslint/consistent-type-imports': 'error',
			// Allow underscore-prefixed names to mark intentionally unused.
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
	// .mjs files: base lint only (no type-aware rules; these run outside the TS project).
	{
		files: ['**/*.mjs'],
		rules: {
			'no-var': 'error',
			'prefer-const': 'warn',
			eqeqeq: 'error',
		},
	},
	// Test files: relax no-floating-promises. node:test's `test()` returns a
	// Promise that the runner itself awaits internally; flagging every top-level
	// `test('name', () => {...})` as a floating promise produces 52 false
	// positives across the 9 test files. Disable for tests/ only.
	{
		files: ['tests/**/*.ts'],
		rules: {
			'@typescript-eslint/no-floating-promises': 'off',
		},
	}
);
