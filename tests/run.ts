// run.ts - Node-side test runner for sports-life-game.
//
// Runs every characterization test under tsx in sequence. No DOM, no network.
// Browser-coupled flows are covered by Playwright (tests/playwright/autoplay.mjs) and
// not invoked here.
//
// Run with: npx tsx tests/run.ts
//
// Add new test modules to TEST_MODULES below as they are written. Each module
// is expected to throw on failure (plain `assert` is fine) and print a final
// summary line on success.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

//============================================
// Test modules to run, in order. Order matters only for readability of the
// console output; the runner does not care.
const TEST_MODULES: readonly string[] = [
	'tests/test_rng.ts',
	'tests/test_player_helpers.ts',
	'tests/test_handler_registry.ts',
	'tests/test_simulator.ts',
	'tests/check_math_random_budget.ts',
	'tests/check_dom_imports.ts',
	'tests/test_choice_schemas.ts',
	'tests/test_plugin_host.ts',
	'tests/check_plugin_boundaries.ts',
];

//============================================
function repoRoot(): string {
	const here: string = url.fileURLToPath(import.meta.url);
	return path.resolve(path.dirname(here), '..');
}

//============================================
// Path to the CSV ESM loader hook used by Node + tsx so `import x from './foo.csv'`
// resolves to the file's text content (matching esbuild's text loader contract).
const CSV_LOADER_REL = 'tests/fixtures/csv_loader.mjs';

//============================================
// Run a single tsx target. Returns true on success, false on any nonzero exit.
function runOne(root: string, rel: string): boolean {
	const csvLoaderUrl = url.pathToFileURL(path.join(root, CSV_LOADER_REL)).href;
	// Silence DEP0205 from tsx's internal `module.register()` use. Our own
	// csv_loader.mjs already uses the new registerHooks API.
	const env = { ...process.env, NODE_OPTIONS: '--disable-warning=DEP0205' };
	const result = spawnSync('npx', ['tsx', '--import', csvLoaderUrl, rel], {
		cwd: root,
		stdio: 'inherit',
		encoding: 'utf8',
		env,
	});
	return result.status === 0;
}

//============================================
function main(): void {
	const root: string = repoRoot();
	const failed: string[] = [];
	for (const rel of TEST_MODULES) {
		if (!runOne(root, rel)) {
			failed.push(rel);
		}
	}
	if (failed.length > 0) {
		console.error('');
		console.error(`run.ts: ${failed.length} test module(s) failed:`);
		for (const rel of failed) {
			console.error(`  ${rel}`);
		}
		process.exit(1);
	}
	console.log('');
	console.log(`run.ts: all ${TEST_MODULES.length} test modules passed.`);
}

main();
