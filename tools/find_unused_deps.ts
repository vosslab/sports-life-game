/**
 * Find unused npm dependencies in package.json
 * Scans src/, tools/, tests/ for imports and checks if packages are used
 */

import fs from 'node:fs';
import path from 'node:path';

// Read package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Combine all dependencies
const allDeps = {
	...packageJson.dependencies,
	...packageJson.devDependencies,
	...packageJson.optionalDependencies,
};

const depNames = Object.keys(allDeps);

// Collect all source files to scan
const sourcePatterns = ['src', 'tools', 'tests', 'index.html'];
const filesToScan: string[] = [];

function walkDir(dir: string): void {
	try {
		const entries = fs.readdirSync(dir);
		for (const entry of entries) {
			const fullPath = path.join(dir, entry);
			const stat = fs.statSync(fullPath);

			if (stat.isDirectory()) {
				// Skip node_modules, _out, archive
				if (entry === 'node_modules' || entry === '_out' || entry === 'archive') {
					continue;
				}
				walkDir(fullPath);
			} else if (
				entry.endsWith('.ts') ||
				entry.endsWith('.mjs') ||
				entry.endsWith('.js') ||
				entry.endsWith('.html') ||
				entry.endsWith('.json')
			) {
				filesToScan.push(fullPath);
			}
		}
	} catch {
		// Directory might not exist
	}
}

for (const pattern of sourcePatterns) {
	walkDir(pattern);
}

// Check which deps are referenced
const usedDeps = new Set<string>();
const depReferences: Record<string, { count: number; files: string[] }> = {};

for (const dep of depNames) {
	depReferences[dep] = { count: 0, files: [] };
}

for (const file of filesToScan) {
	let content: string;
	try {
		content = fs.readFileSync(file, 'utf-8');
	} catch {
		continue;
	}

	for (const dep of depNames) {
		// Check for import/require statements
		const patterns = [
			new RegExp(`import\\s+(?:\\{[^}]*\\}|\\w+|"[^"]*"|'[^']*')\\s+from\\s+['"]${dep}['"]`),
			new RegExp(`require\\s*\\(\\s*['"]${dep}['"]`),
			// Check for npx invocation in scripts
			new RegExp(`npx\\s+${dep}`),
			// Check for direct reference in strings (e.g., spawn('tsc'))
			new RegExp(`['"]${dep}['"]`),
		];

		for (const pattern of patterns) {
			if (pattern.test(content)) {
				usedDeps.add(dep);
				depReferences[dep].count++;
				if (!depReferences[dep].files.includes(file)) {
					depReferences[dep].files.push(file);
				}
				break;
			}
		}
	}
}

// Report unused deps
const unusedDeps: string[] = [];
for (const dep of depNames) {
	if (!usedDeps.has(dep)) {
		unusedDeps.push(dep);
	}
}

// Print results
console.log('=== Dependency Usage Report ===\n');

console.log(`Total dependencies: ${depNames.length}`);
console.log(`Used dependencies: ${usedDeps.size}`);
console.log(`Unused dependencies: ${unusedDeps.length}\n`);

if (unusedDeps.length > 0) {
	console.log('UNUSED DEPENDENCIES:');
	for (const dep of unusedDeps) {
		console.log(`  - ${dep}`);
	}
	console.log('');
}

console.log('USED DEPENDENCIES:');
for (const dep of depNames) {
	if (usedDeps.has(dep)) {
		const refs = depReferences[dep];
		console.log(`  ${dep}: ${refs.count} references in ${refs.files.length} files`);
	}
}

// Output JSON for tools/_out
const outputFile = path.join('tools', '_out', 'dep_usage.json');
const output = {
	total: depNames.length,
	used: usedDeps.size,
	unused: unusedDeps,
	details: depReferences,
};

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
console.log(`\nDetailed report written to: ${outputFile}`);
