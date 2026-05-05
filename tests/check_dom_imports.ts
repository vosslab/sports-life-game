// check_dom_imports.ts - guard against DOM/UI imports inside the simulation tree.
//
// The simulation tree must remain pure: no `document`, no `getElementById`,
// no imports from `src/ui/`, `src/render/`, `src/popup`, `src/tabs`,
// `src/tab_manager`, or `src/dom_utils`. The render layer pulls a
// GameViewState; the simulation never pushes DOM.
//
// Run with: npx tsx tests/check_dom_imports.ts
//
// This script fails on the first violation it finds. It is wired into
// tests/run.ts and runs in the standard test pass.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

//============================================
// Simulation tree (matches tests/check_math_random_budget.ts).
const SIM_TREE: readonly string[] = [
	'src/core',
	'src/weekly',
	'src/simulator',
	'src/clutch',
	'src/season',
	'src/high_school',
	'src/college',
	'src/nfl_handlers',
	'src/week_sim',
];

//============================================
// Forbidden import sources (substrings tested against the import target).
// Anything starting with `src/ui/`, `src/render/`, etc. counts.
const FORBIDDEN_IMPORT_PATTERNS: readonly RegExp[] = [
	/['"][./]*ui\/[^'"]*['"]/,
	/['"][./]*render\/[^'"]*['"]/,
	/['"][./]*popup(\.js)?['"]/,
	/['"][./]*tabs(\.js)?['"]/,
	/['"][./]*tab_manager(\.js)?['"]/,
	/['"][./]*dom_utils(\.js)?['"]/,
];

//============================================
// Forbidden raw DOM identifiers anywhere in source.
const FORBIDDEN_DOM_TOKENS: readonly RegExp[] = [
	/\bdocument\.\w+/,
	/\bgetElementById\b/,
	/\bquerySelector\b/,
	/\binnerHTML\b/,
	/\bHTMLElement\b/,
];

//============================================
function repoRoot(): string {
	const here: string = url.fileURLToPath(import.meta.url);
	return path.resolve(path.dirname(here), '..');
}

//============================================
// Recursively collect all .ts files in a directory.
function listTsFiles(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	const out: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...listTsFiles(full));
		} else if (entry.isFile() && entry.name.endsWith('.ts')) {
			out.push(full);
		}
	}
	return out;
}

//============================================
// Strip block and line comments to avoid false positives on commented lines.
function stripComments(src: string): string {
	const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
	const noLine = noBlock.replace(/(^|[^:])\/\/.*$/gm, '$1');
	return noLine;
}

//============================================
interface Violation {
	file: string;
	line: number;
	kind: string;
	text: string;
}

function checkFile(absPath: string, root: string): Violation[] {
	const raw: string = fs.readFileSync(absPath, 'utf8');
	const stripped: string = stripComments(raw);
	const rel: string = path.relative(root, absPath);
	const violations: Violation[] = [];
	const lines: string[] = stripped.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line: string = lines[i];
		// Forbidden imports apply only to import/export-from lines.
		const isImportLine: boolean = /^\s*(import|export)\b.*\bfrom\b/.test(line);
		if (isImportLine) {
			for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
				if (pattern.test(line)) {
					violations.push({
						file: rel,
						line: i + 1,
						kind: 'forbidden import',
						text: line.trim(),
					});
				}
			}
		}
		// Forbidden DOM identifiers can appear anywhere.
		for (const pattern of FORBIDDEN_DOM_TOKENS) {
			if (pattern.test(line)) {
				violations.push({
					file: rel,
					line: i + 1,
					kind: 'forbidden DOM token',
					text: line.trim(),
				});
				break;
			}
		}
	}
	return violations;
}

//============================================
function main(): void {
	const root: string = repoRoot();
	const allViolations: Violation[] = [];
	for (const rel of SIM_TREE) {
		const dir: string = path.join(root, rel);
		for (const file of listTsFiles(dir)) {
			allViolations.push(...checkFile(file, root));
		}
	}
	if (allViolations.length === 0) {
		console.log(`DOM imports check: 0 violations across ${SIM_TREE.length} sim-tree dirs.`);
		return;
	}
	console.error(`DOM imports check: ${allViolations.length} violation(s):`);
	for (const v of allViolations) {
		console.error(`  ${v.file}:${v.line} [${v.kind}] ${v.text}`);
	}
	process.exit(1);
}

main();
