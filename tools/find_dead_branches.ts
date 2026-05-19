//============================================
// find_dead_branches.ts
// Scans TypeScript source files for dead code branches in REACHABLE files only:
// - Literal if (false), if (0), if (null), if (undefined), if ("")
// - while (false) and similar loops
// - else branches after always-true conditions
// - Unreachable code after return/throw/break
// Outputs findings to tools/_out/dead_branches.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DeadBranch {
	file: string;
	line: number;
	type: "literal_false" | "unreachable_after_return" | "else_after_always_true" | "dead_export_in_reachable";
	description: string;
	code: string;
}

interface ScanResult {
	timestamp: string;
	reachableFiles: number;
	deadBranchesFound: DeadBranch[];
	summary: {
		literal_false: number;
		unreachable_after_return: number;
		else_after_always_true: number;
		dead_export_in_reachable: number;
	};
}

//============================================
// Load reachable modules from dead_code.json
function loadReachableModules(): Set<string> {
	const deadCodePath = path.join(__dirname, "_out", "dead_code.json");
	const srcDir = path.join(__dirname, "..", "src");

	if (!fs.existsSync(deadCodePath)) {
		// Fallback: scan all TS files as reachable
		const allFiles = new Set<string>();
		function walkDir(dir: string) {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					walkDir(fullPath);
				} else if (entry.isFile() && entry.name.endsWith(".ts")) {
					allFiles.add(fullPath);
				}
			}
		}
		walkDir(srcDir);
		return allFiles;
	}

	try {
		const content = fs.readFileSync(deadCodePath, "utf-8");
		const data = JSON.parse(content);
		const unreachableSet = new Set<string>();

		// Collect unreachable file paths
		if (Array.isArray(data.unreachable)) {
			data.unreachable.forEach((m: any) => {
				if (m.filePath) {
					unreachableSet.add(m.filePath);
				}
			});
		}

		// Scan all TS files in src/ and exclude unreachable ones
		const reachableSet = new Set<string>();
		function walkDir(dir: string) {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					walkDir(fullPath);
				} else if (entry.isFile() && entry.name.endsWith(".ts")) {
					if (!unreachableSet.has(fullPath)) {
						reachableSet.add(fullPath);
					}
				}
			}
		}
		walkDir(srcDir);

		return reachableSet;
	} catch (err) {
		// Fallback: scan all TS files if dead_code.json is invalid or unreadable
		console.warn(`Warning: could not read dead_code.json, scanning all TS files. Error: ${err}`);
		const allFiles = new Set<string>();
		function walkDir(dir: string) {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					walkDir(fullPath);
				} else if (entry.isFile() && entry.name.endsWith(".ts")) {
					allFiles.add(fullPath);
				}
			}
		}
		walkDir(srcDir);
		return allFiles;
	}
}

//============================================
// Scan a single file for dead branches
function scanFile(filePath: string): DeadBranch[] {
	const findings: DeadBranch[] = [];

	if (!fs.existsSync(filePath)) {
		return findings;
	}

	const content = fs.readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	lines.forEach((line, idx) => {
		const lineNum = idx + 1;

		// Pattern 1: Literal false conditions
		const falsePatterns = [
			/if\s*\(\s*false\s*\)/,
			/if\s*\(\s*0\s*\)/,
			/if\s*\(\s*null\s*\)/,
			/if\s*\(\s*undefined\s*\)/,
			/if\s*\(\s*""\s*\)/,
			/while\s*\(\s*false\s*\)/,
			/while\s*\(\s*0\s*\)/,
		];

		for (const pattern of falsePatterns) {
			if (pattern.test(line)) {
				findings.push({
					file: filePath,
					line: lineNum,
					type: "literal_false",
					description: "Dead branch: literal false/0/null/undefined condition",
					code: line.trim(),
				});
				break; // Only report once per line
			}
		}

		// Pattern 2: Unreachable code after return/throw/break
		if (/^\s*(return|throw|break|continue)\s*[;)]/.test(line)) {
			// Check if next non-empty line is not closing brace or case label
			for (let i = idx + 1; i < Math.min(idx + 3, lines.length); i++) {
				const nextLine = lines[i].trim();
				if (nextLine.length === 0) continue;
				if (/^[}\]];?$/.test(nextLine)) break;
				if (/^case\s+|^default\s*:/.test(nextLine)) break;

				// Found potential unreachable code
				findings.push({
					file: filePath,
					line: i + 1,
					type: "unreachable_after_return",
					description: "Code appears unreachable (after return/throw/break)",
					code: nextLine.substring(0, 80),
				});
				break;
			}
		}

		// Pattern 3: else after always-true condition
		if (/if\s*\(\s*true\s*\)/.test(line)) {
			// Look for else in next few lines
			for (let i = idx + 1; i < Math.min(idx + 10, lines.length); i++) {
				const nextLine = lines[i].trim();
				if (/^\}\s*else\s*[\{]?/.test(nextLine)) {
					findings.push({
						file: filePath,
						line: i + 1,
						type: "else_after_always_true",
						description: "Dead else branch: follows always-true condition",
						code: nextLine,
					});
					break;
				}
				if (/^[a-zA-Z_]/.test(nextLine) && !/^\}/.test(nextLine)) break;
			}
		}
	});

	return findings;
}

//============================================
// Main scan logic
function main(): void {
	const srcDir = path.join(__dirname, "..", "src");
	const reachableModules = loadReachableModules();

	const findings: DeadBranch[] = [];
	let reachableFileCount = 0;

	// Find all TypeScript files in src/
	function walkDir(dir: string): void {
		if (!fs.existsSync(dir)) {
			return;
		}

		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				walkDir(fullPath);
			} else if (entry.isFile() && entry.name.endsWith(".ts")) {
				// Only scan reachable files
				if (reachableModules.has(fullPath)) {
					reachableFileCount++;
					const fileFinding = scanFile(fullPath);
					findings.push(...fileFinding);
				}
			}
		}
	}

	walkDir(srcDir);

	// Compile results
	const summary = {
		literal_false: findings.filter((f) => f.type === "literal_false").length,
		unreachable_after_return: findings.filter((f) => f.type === "unreachable_after_return").length,
		else_after_always_true: findings.filter((f) => f.type === "else_after_always_true").length,
		dead_export_in_reachable: 0,
	};

	const result: ScanResult = {
		timestamp: new Date().toISOString(),
		reachableFiles: reachableFileCount,
		deadBranchesFound: findings,
		summary,
	};

	// Ensure output directory exists
	const outDir = path.join(__dirname, "_out");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	// Write results
	const outPath = path.join(outDir, "dead_branches.json");
	fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

	// Console output
	console.log(`Scanned ${reachableFileCount} reachable TypeScript files in src/`);
	console.log(`Dead branches found: ${findings.length}`);
	console.log(`  - Literal false conditions: ${summary.literal_false}`);
	console.log(`  - Code after return/throw: ${summary.unreachable_after_return}`);
	console.log(`  - Else after always-true: ${summary.else_after_always_true}`);
	console.log(`\nResults written to: ${outPath}`);

	if (findings.length > 0) {
		console.log("\nFindings:");
		findings.forEach((f) => {
			console.log(
				`  ${f.file}:${f.line} [${f.type}] ${f.description}`
			);
			console.log(`    ${f.code}`);
		});
	}
}

main();
