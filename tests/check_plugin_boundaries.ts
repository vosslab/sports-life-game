// check_plugin_boundaries.ts - enforce architectural boundaries for plugins
//
// Static scan: asserts that plugin registry files and plugin entry points
// do NOT import from forbidden modules (phase folders, UI widgets, simulator engine).
//
// Forbidden imports:
//   - src/childhood/
//   - src/high_school/
//   - src/college/
//   - src/nfl_handlers/
//   - src/ui/*_widget.ts (specifically widget files, not helpers)
//   - src/simulator/engine/
//
// Allowed imports from core, stdlib, and specific UI helpers (format_helpers, ui_utils, dom_utils).
//
// Run with: npx tsx tests/check_plugin_boundaries.ts

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

//============================================
// DENY_PATTERNS: regexes matching forbidden import paths
const DENY_PATTERNS: RegExp[] = [
	/from\s+['"].*src\/childhood\/.*['"]/,
	/from\s+['"].*src\/high_school\/.*['"]/,
	/from\s+['"].*src\/college\/.*['"]/,
	/from\s+['"].*src\/nfl_handlers\/.*['"]/,
	// Forbid UI widget imports (*_widget.ts), but allow helpers
	/from\s+['"].*src\/ui\/.*_widget\.ts['"]/,
	/from\s+['"].*src\/simulator\/engine\/.*['"]/,
];

//============================================
// Helper: recursively find all .ts files in a directory
function findTsFiles(dir: string): string[] {
	const results: string[] = [];

	function walk(current: string): void {
		const entries = fs.readdirSync(current, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				// Skip node_modules and other non-relevant dirs
				if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
					walk(fullPath);
				}
			} else if (entry.isFile() && entry.name.endsWith('.ts')) {
				results.push(fullPath);
			}
		}
	}

	walk(dir);
	return results;
}

//============================================
// Helper: check if a line violates any deny pattern
function isViolation(line: string): boolean {
	for (const pattern of DENY_PATTERNS) {
		if (pattern.test(line)) {
			return true;
		}
	}
	return false;
}

//============================================
// Main scan
function main(): void {
	const here = url.fileURLToPath(import.meta.url);
	const repoRoot = path.resolve(path.dirname(here), '..');
	const pluginRegistriesDir = path.join(repoRoot, 'src', 'plugins', 'registries');
	const pluginsDir = path.join(repoRoot, 'src', 'plugins');

	const violations: string[] = [];

	// Scan registries
	const registryFiles = findTsFiles(pluginRegistriesDir);
	for (const file of registryFiles) {
		const content = fs.readFileSync(file, 'utf8');
		const lines = content.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (isViolation(line)) {
				const relPath = path.relative(repoRoot, file);
				violations.push(`${relPath}:${i + 1}: ${line.trim()}`);
			}
		}
	}

	// Scan plugin subdirectories: recursively scan ALL .ts files
	const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isDirectory() && !entry.name.startsWith('.')) {
			const pluginSubdir = path.join(pluginsDir, entry.name);
			const pluginTsFiles = findTsFiles(pluginSubdir);
			for (const file of pluginTsFiles) {
				const content = fs.readFileSync(file, 'utf8');
				const lines = content.split('\n');
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					if (isViolation(line)) {
						const relPath = path.relative(repoRoot, file);
						violations.push(`${relPath}:${i + 1}: ${line.trim()}`);
					}
				}
			}
		}
	}

	if (violations.length > 0) {
		console.error('check_plugin_boundaries.ts: found boundary violations:');
		for (const violation of violations) {
			console.error(`  ${violation}`);
		}
		process.exit(1);
	}

	console.log('check_plugin_boundaries.ts: no boundary violations');
}

main();
