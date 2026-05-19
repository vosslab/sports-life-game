//
// dead_code_scan.ts - Dead code detection via import graph analysis
//
// Walks src/ and tools/sim_*.ts, resolving every import statement, and produces
// a JSON report of modules reachable from entry points. Identifies files with
// importer-count 0 (unreachable) or only-imported-by-also-dead modules.
//
// Handles:
// - Static imports (import X from 'path')
// - Dynamic imports (import('path'))
// - String-literal fetch() calls
// - .ts / .js / .mjs extensions
// - Relative paths (../, ./)
// - Node: prefix imports
//

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

//============================================
// Types and interfaces

interface ModuleInfo {
	filePath: string;
	importers: Set<string>;
	imports: Set<string>;
	isEntryPoint: boolean;
	isReachable: boolean;
}

interface DeadCodeReport {
	timestamp: string;
	entryPoints: string[];
	totalModules: number;
	unreachableCount: number;
	unreachable: Array<{
		filePath: string;
		importerCount: number;
		importedBy: string[];
	}>;
	riskFactors: Array<{
		filePath: string;
		type: string;
		line: number;
		pattern: string;
	}>;
}

//============================================
// Configuration

const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
const SRC_DIR = path.join(REPO_ROOT, 'src');
const TOOLS_DIR = path.join(REPO_ROOT, 'tools');
const OUTPUT_DIR = path.join(TOOLS_DIR, '_out');

const ENTRY_POINTS = [
	path.join(SRC_DIR, 'main.ts'),
	path.join(REPO_ROOT, 'tests', 'autoplay.mjs'),
	path.join(TOOLS_DIR, 'sim_positions.ts'),
	path.join(TOOLS_DIR, 'sim_conference_season.ts'),
	path.join(TOOLS_DIR, 'sim_player_season.ts'),
	path.join(TOOLS_DIR, 'sim_distribution.ts'),
];

const EXTENSIONS = ['.ts', '.mjs', '.js', '.tsx', '.jsx'];

//============================================
// File walking and import extraction

function getAllTypeScriptFiles(dir: string): string[] {
	const files: string[] = [];
	const queue = [dir];

	while (queue.length > 0) {
		const current = queue.shift()!;
		const entries = fs.readdirSync(current, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.name.startsWith('.')) continue;
			if (entry.name === '_out') continue;

			const fullPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				queue.push(fullPath);
			} else if (EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
				files.push(fullPath);
			}
		}
	}

	return files;
}

//============================================
// Import extraction

function extractImports(filePath: string): string[] {
	const content = fs.readFileSync(filePath, 'utf-8');
	const imports: string[] = [];

	// Static imports: import X from 'path'
	const staticPattern = /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g;
	let match;
	while ((match = staticPattern.exec(content)) !== null) {
		const importPath = match[1];
		if (!importPath.startsWith('node:')) {
			imports.push(importPath);
		}
	}

	// Dynamic imports: import('path')
	const dynamicPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
	while ((match = dynamicPattern.exec(content)) !== null) {
		const importPath = match[1];
		if (!importPath.startsWith('node:')) {
			imports.push(importPath);
		}
	}

	// Barrel re-exports: export { ... } from 'path' and export * from 'path'
	// These make the re-exported module part of the public API, so they count as imports for reachability.
	const barrelPattern = /export\s+(?:\*\s+|{[^}]*})\s+from\s+['"]([^'"]+)['"]/g;
	while ((match = barrelPattern.exec(content)) !== null) {
		const importPath = match[1];
		if (!importPath.startsWith('node:')) {
			imports.push(importPath);
		}
	}

	// fetch(string-literal) - detect string module names passed to fetch
	const fetchPattern = /fetch\s*\(\s*['"]([^'"]+)['"]/g;
	while ((match = fetchPattern.exec(content)) !== null) {
		const modulePath = match[1];
		if (modulePath.endsWith('.ts') || modulePath.endsWith('.mjs') || modulePath.endsWith('.js')) {
			imports.push(modulePath);
		}
	}

	return imports;
}

//============================================
// Module resolution

function resolveImport(fromFile: string, importPath: string): string | null {
	const fromDir = path.dirname(fromFile);
	let resolved: string | null = null;

	// Handle relative paths
	if (importPath.startsWith('.')) {
		let candidate = path.join(fromDir, importPath);

		// Remove .js/.mjs extension and try to find the actual file
		const withoutExt = candidate.replace(/\.(js|mjs|ts|tsx|jsx)$/, '');

		// Try exact match first
		resolved = tryResolveFile(candidate);
		if (resolved) return resolved;

		// Try without extension
		resolved = tryResolveFile(withoutExt);
		if (resolved) return resolved;

		// Try with .ts extension
		resolved = tryResolveFile(withoutExt + '.ts');
		if (resolved) return resolved;

		// Try with .tsx extension
		resolved = tryResolveFile(withoutExt + '.tsx');
		if (resolved) return resolved;

		// Try with .mjs extension
		resolved = tryResolveFile(withoutExt + '.mjs');
		if (resolved) return resolved;

		// Try with .js extension
		resolved = tryResolveFile(withoutExt + '.js');
		if (resolved) return resolved;

		// Try as directory with index.ts
		resolved = tryResolveFile(path.join(withoutExt, 'index.ts'));
		if (resolved) return resolved;

		// Try as directory with index.mjs
		resolved = tryResolveFile(path.join(withoutExt, 'index.mjs'));
		if (resolved) return resolved;

		// Try as directory with index.js
		resolved = tryResolveFile(path.join(withoutExt, 'index.js'));
		if (resolved) return resolved;
	}

	// Handle absolute-like paths in src/
	if (!importPath.startsWith('.') && !importPath.includes('/')) {
		// Try as module in src/
		let candidate = path.join(SRC_DIR, importPath);
		const withoutExt = candidate.replace(/\.(js|mjs|ts|tsx|jsx)$/, '');

		resolved = tryResolveFile(withoutExt);
		if (resolved) return resolved;

		resolved = tryResolveFile(withoutExt + '.ts');
		if (resolved) return resolved;

		resolved = tryResolveFile(withoutExt + '.tsx');
		if (resolved) return resolved;

		resolved = tryResolveFile(withoutExt + '.mjs');
		if (resolved) return resolved;

		resolved = tryResolveFile(withoutExt + '.js');
		if (resolved) return resolved;

		resolved = tryResolveFile(path.join(withoutExt, 'index.ts'));
		if (resolved) return resolved;

		resolved = tryResolveFile(path.join(withoutExt, 'index.mjs'));
		if (resolved) return resolved;

		resolved = tryResolveFile(path.join(withoutExt, 'index.js'));
		if (resolved) return resolved;
	}

	return null;
}

function tryResolveFile(filePath: string): string | null {
	try {
		const stat = fs.statSync(filePath);
		if (stat.isFile()) {
			return path.normalize(filePath);
		}
	} catch {
		// File does not exist
	}
	return null;
}

//============================================
// Graph traversal and reachability

function buildImportGraph(allFiles: string[]): Map<string, ModuleInfo> {
	const graph = new Map<string, ModuleInfo>();

	// Initialize all modules
	for (const file of allFiles) {
		graph.set(file, {
			filePath: file,
			importers: new Set(),
			imports: new Set(),
			isEntryPoint: ENTRY_POINTS.includes(file),
			isReachable: false,
		});
	}

	// Extract imports and build dependency edges
	for (const file of allFiles) {
		const imports = extractImports(file);
		const moduleInfo = graph.get(file)!;

		for (const importPath of imports) {
			const resolved = resolveImport(file, importPath);
			if (resolved && graph.has(resolved)) {
				moduleInfo.imports.add(resolved);
				const importedModule = graph.get(resolved)!;
				importedModule.importers.add(file);
			}
		}
	}

	return graph;
}

function markReachable(graph: Map<string, ModuleInfo>): void {
	const visited = new Set<string>();
	const queue: string[] = [];

	// Start from entry points
	for (const entryPoint of ENTRY_POINTS) {
		if (graph.has(entryPoint)) {
			queue.push(entryPoint);
			visited.add(entryPoint);
			graph.get(entryPoint)!.isReachable = true;
		}
	}

	// BFS traversal
	while (queue.length > 0) {
		const current = queue.shift()!;
		const moduleInfo = graph.get(current)!;

		for (const imported of moduleInfo.imports) {
			if (!visited.has(imported)) {
				visited.add(imported);
				const importedModule = graph.get(imported)!;
				importedModule.isReachable = true;
				queue.push(imported);
			}
		}
	}
}

//============================================
// Report generation

function generateReport(graph: Map<string, ModuleInfo>): DeadCodeReport {
	const unreachable: Array<{
		filePath: string;
		importerCount: number;
		importedBy: string[];
	}> = [];

	const riskFactors: Array<{
		filePath: string;
		type: string;
		line: number;
		pattern: string;
	}> = [];

	for (const [filePath, moduleInfo] of graph) {
		if (!moduleInfo.isReachable) {
			unreachable.push({
				filePath,
				importerCount: moduleInfo.importers.size,
				importedBy: Array.from(moduleInfo.importers).sort(),
			});
		}
	}

	// Detect potential dynamic imports and fetch patterns
	for (const filePath of Array.from(graph.keys())) {
		const content = fs.readFileSync(filePath, 'utf-8');
		const lines = content.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Dynamic import() with variable
			if (line.includes('import(') && !line.match(/import\s*\(\s*['"][^'"]+['"]\s*\)/)) {
				riskFactors.push({
					filePath,
					type: 'dynamic_import_variable',
					line: i + 1,
					pattern: line.trim(),
				});
			}

			// fetch with computed string
			if (line.includes('fetch(') && !line.match(/fetch\s*\(\s*['"][^'"]*['"]/)) {
				riskFactors.push({
					filePath,
					type: 'fetch_computed',
					line: i + 1,
					pattern: line.trim(),
				});
			}

			// require() calls
			if (line.includes('require(')) {
				riskFactors.push({
					filePath,
					type: 'require_call',
					line: i + 1,
					pattern: line.trim(),
				});
			}
		}
	}

	// Sort unreachable by path for stable output
	unreachable.sort((a, b) => a.filePath.localeCompare(b.filePath));

	return {
		timestamp: new Date().toISOString(),
		entryPoints: ENTRY_POINTS.sort(),
		totalModules: graph.size,
		unreachableCount: unreachable.length,
		unreachable,
		riskFactors: riskFactors.sort((a, b) => a.filePath.localeCompare(b.filePath)),
	};
}

//============================================
// Main

async function main(): Promise<void> {
	try {
		// Ensure output directory exists
		if (!fs.existsSync(OUTPUT_DIR)) {
			fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		}

		// Collect all TypeScript files
		console.log('Scanning for TypeScript files...');
		const srcFiles = getAllTypeScriptFiles(SRC_DIR);
		const toolsFiles = getAllTypeScriptFiles(TOOLS_DIR).filter(f => !f.includes('_out'));
		const allFiles = [...srcFiles, ...toolsFiles];

		console.log(`Found ${allFiles.length} TypeScript files`);

		// Build import graph
		console.log('Building import graph...');
		const graph = buildImportGraph(allFiles);

		// Mark reachable modules
		console.log('Analyzing reachability...');
		markReachable(graph);

		// Generate report
		console.log('Generating report...');
		const report = generateReport(graph);

		// Write report to JSON
		const reportPath = path.join(OUTPUT_DIR, 'dead_code.json');
		fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

		console.log(`\nReport written to ${reportPath}`);
		console.log(`\nSummary:`);
		console.log(`  Total modules: ${report.totalModules}`);
		console.log(`  Unreachable: ${report.unreachableCount}`);
		console.log(`  Risk factors detected: ${report.riskFactors.length}`);

		if (report.unreachable.length > 0) {
			console.log(`\nUnreachable modules:`);
			for (const unreachItem of report.unreachable) {
				const relPath = path.relative(REPO_ROOT, unreachItem.filePath);
				console.log(`  ${relPath} (imported by: ${unreachItem.importedBy.length})`);
			}
		}

		if (report.riskFactors.length > 0) {
			console.log(`\nRisk factors (potential dead code not detected):`);
			for (const risk of report.riskFactors.slice(0, 10)) {
				const relPath = path.relative(REPO_ROOT, risk.filePath);
				console.log(`  ${relPath}:${risk.line} [${risk.type}]`);
			}
			if (report.riskFactors.length > 10) {
				console.log(`  ... and ${report.riskFactors.length - 10} more`);
			}
		}

		process.exit(0);
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

main();
