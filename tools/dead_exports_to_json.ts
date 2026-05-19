//============================================
// Parse ts-prune output into JSON format
// Input: ts-prune stdout
// Output: tools/_out/dead_exports.json
//============================================

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

interface DeadExport {
	file: string;
	symbol: string;
	line: number;
	safeToDelete: boolean;
	reason: string;
}

interface DeadExportsReport {
	timestamp: string;
	totalExamined: number;
	deadExports: DeadExport[];
	categories: {
		safeToDelete: number;
		needsManualCheck: number;
	};
}

function main() {
	// Get repo root
	const repoRoot = execSync("git rev-parse --show-toplevel", {
		encoding: "utf-8",
	}).trim();

	// Run ts-prune and capture output
	const output = execSync("npx ts-prune 2>&1", { encoding: "utf-8" });

	const lines = output.split("\n").filter((line) => line.trim());

	// Parse each line: "src/file.ts:123 - Symbol" or "src/file.ts:123 - Symbol (used in module)"
	const deadExports: DeadExport[] = [];
	const symbolsUsedInModules = new Set<string>();

	// First pass: collect all symbols marked "(used in module)" to track for manual check
	lines.forEach((line) => {
		if (line.includes("(used in module)")) {
			// Extract symbol name
			const match = line.match(/(?:^|\s)-\s+(\w+)\s+\(used in module\)/);
			if (match) {
				symbolsUsedInModules.add(match[1]);
			}
		}
	});

	// Second pass: parse dead exports
	const seen = new Set<string>();
	lines.forEach((line) => {
		if (!line.trim()) return;

		// Format: src/file.ts:123 - SymbolName
		// or:     src/file.ts:123 - SymbolName (used in module)
		const match = line.match(
			/^(src\/.+\.ts):(\d+)\s+-\s+(\w+)(?:\s+\(used in module\))?$/
		);
		if (!match) return;

		const filePath = match[1];
		const lineNum = parseInt(match[2], 10);
		const symbol = match[3];

		// Skip duplicates
		const key = `${filePath}:${symbol}`;
		if (seen.has(key)) return;
		seen.add(key);

		// Determine if safe to delete: symbols marked "(used in module)" need manual check
		// because they might be internal to that module only (which is still unused elsewhere)
		const isUsedInModuleOnly = line.includes("(used in module)");

		deadExports.push({
			file: filePath,
			symbol,
			line: lineNum,
			safeToDelete: !isUsedInModuleOnly,
			reason: isUsedInModuleOnly
				? "Used only within its own module (exported but not imported elsewhere)"
				: "Not used anywhere in the codebase",
		});
	});

	// Sort by file, then by line
	deadExports.sort((a, b) => {
		if (a.file !== b.file) return a.file.localeCompare(b.file);
		return a.line - b.line;
	});

	const report: DeadExportsReport = {
		timestamp: new Date().toISOString(),
		totalExamined: deadExports.length,
		deadExports,
		categories: {
			safeToDelete: deadExports.filter((e) => e.safeToDelete).length,
			needsManualCheck: deadExports.filter((e) => !e.safeToDelete).length,
		},
	};

	// Ensure output directory exists
	const outputDir = path.join(repoRoot, "tools", "_out");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Write output
	const outputPath = path.join(outputDir, "dead_exports.json");
	fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

	console.log(`Dead exports scan complete.`);
	console.log(`Total dead exports found: ${report.totalExamined}`);
	console.log(`Safe to delete: ${report.categories.safeToDelete}`);
	console.log(`Needs manual check: ${report.categories.needsManualCheck}`);
	console.log(`Output: ${outputPath}`);
}

main();
