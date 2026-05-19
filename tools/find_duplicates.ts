/**
 * Find duplicate function bodies across the TypeScript codebase.
 * Uses token hashing to identify clusters of similar/identical code blocks.
 */

import fs from 'node:fs';
import path from 'node:path';

interface FunctionInfo {
	path: string;
	symbol: string;
	line_start: number;
	line_end: number;
	body: string;
	token_hash: string;
	token_count: number;
}

interface Cluster {
	cluster_id: number;
	lines: number;
	token_similarity: number;
	files: Array<{
		path: string;
		line_start: number;
		line_end: number;
		symbol: string;
	}>;
}

//============================================
// Tokenize function body into a normalized token stream
//============================================

function tokenize(code: string): string[] {
	// Remove comments
	let cleaned = code
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*/g, '');

	// Split on whitespace and operators
	const tokens = cleaned
		.split(/(\s+|[{}()\[\];,.]|\+\+|--|==|!=|<=|>=|===|!==|&&|\|\|)/g)
		.filter((t) => t && t.trim())
		.map((t) => t.toLowerCase());

	return tokens;
}

function hashTokens(tokens: string[]): string {
	// Simple hash: join and take a digest-like approach
	const joined = tokens.join('|');
	let hash = 0;
	for (let i = 0; i < joined.length; i++) {
		const char = joined.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash).toString(16);
}

function jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
	const set1 = new Set(tokens1);
	const set2 = new Set(tokens2);

	let intersection = 0;
	for (const token of set1) {
		if (set2.has(token)) intersection++;
	}

	const union = set1.size + set2.size - intersection;
	return union === 0 ? 1 : intersection / union;
}

//============================================
// Extract functions from TypeScript source
//============================================

function extractFunctions(sourceCode: string, filePath: string): FunctionInfo[] {
	const functions: FunctionInfo[] = [];

	// Simple regex-based extraction: look for `function name() {...}`
	// This is a conservative approach; misses arrow functions and methods but finds main function bodies.
	const functionPattern =
		/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;

	let match;
	const lines = sourceCode.split('\n');

	while ((match = functionPattern.exec(sourceCode)) !== null) {
		const symbol = match[1];
		const startPos = match.index + match[0].length;

		// Find matching closing brace
		let braceCount = 1;
		let endPos = startPos;
		for (let i = startPos; i < sourceCode.length && braceCount > 0; i++) {
			if (sourceCode[i] === '{') braceCount++;
			else if (sourceCode[i] === '}') braceCount--;
			endPos = i;
		}

		const body = sourceCode.substring(startPos, endPos);
		const tokens = tokenize(body);
		const tokenHash = hashTokens(tokens);

		// Calculate line numbers
		const beforeBody = sourceCode.substring(0, startPos);
		const lineStart = beforeBody.split('\n').length - 1;
		const lineEnd = lineStart + body.split('\n').length;

		if (tokens.length >= 30) {
			// Only report functions with >= 30 tokens (roughly 30+ lines equivalent)
			functions.push({
				path: filePath,
				symbol,
				line_start: lineStart,
				line_end: lineEnd,
				body,
				token_hash: tokenHash,
				token_count: tokens.length,
			});
		}
	}

	return functions;
}

//============================================
// Scan src/ directory
//============================================

function scanDirectory(dirPath: string): FunctionInfo[] {
	const allFunctions: FunctionInfo[] = [];

	function walk(dir: string) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			// Skip archive and node_modules
			if (entry.name === 'archive' || entry.name === 'node_modules') continue;

			if (entry.isDirectory()) {
				walk(fullPath);
			} else if (entry.isFile() && entry.name.endsWith('.ts')) {
				try {
					const sourceCode = fs.readFileSync(fullPath, 'utf-8');
					const functions = extractFunctions(sourceCode, fullPath);
					allFunctions.push(...functions);
				} catch (err) {
					console.error(`Error reading ${fullPath}: ${err}`);
				}
			}
		}
	}

	walk(dirPath);
	return allFunctions;
}

//============================================
// Cluster similar functions
//============================================

function clusterFunctions(
	functions: FunctionInfo[],
	minSimilarity: number = 0.85
): Cluster[] {
	const clusters: Cluster[] = [];
	const visited = new Set<number>();

	for (let i = 0; i < functions.length; i++) {
		if (visited.has(i)) continue;

		const cluster: FunctionInfo[] = [functions[i]];
		visited.add(i);

		// Find all similar functions
		for (let j = i + 1; j < functions.length; j++) {
			if (visited.has(j)) continue;

			const tokens1 = tokenize(functions[i].body);
			const tokens2 = tokenize(functions[j].body);
			const similarity = jaccardSimilarity(tokens1, tokens2);

			if (similarity >= minSimilarity) {
				cluster.push(functions[j]);
				visited.add(j);
			}
		}

		// Only report clusters with 2+ members (actual duplicates)
		if (cluster.length >= 2) {
			const tokens1 = tokenize(cluster[0].body);
			const tokens2 = tokenize(cluster[1].body);
			const similarity = jaccardSimilarity(tokens1, tokens2);

			clusters.push({
				cluster_id: clusters.length + 1,
				lines: cluster[0].line_end - cluster[0].line_start,
				token_similarity: similarity,
				files: cluster.map((fn) => ({
					path: fn.path,
					line_start: fn.line_start,
					line_end: fn.line_end,
					symbol: fn.symbol,
				})),
			});
		}
	}

	return clusters.sort((a, b) => b.lines - a.lines);
}

//============================================
// Main
//============================================

async function main() {
	const srcDir = path.join(process.cwd(), 'src');

	console.log('Scanning src/ for function definitions...');
	const functions = scanDirectory(srcDir);
	console.log(`Found ${functions.length} functions with >= 30 tokens.`);

	console.log('Clustering similar functions (similarity >= 0.85)...');
	const clusters = clusterFunctions(functions, 0.85);
	console.log(`Found ${clusters.length} duplicate clusters.`);

	// Write output
	const outputPath = path.join(process.cwd(), 'tools', '_out', 'duplicates.json');
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, JSON.stringify(clusters, null, 2));

	console.log(`Cluster report written to ${outputPath}`);

	// Print summary
	console.log('\nCluster Summary:');
	clusters.forEach((cluster) => {
		console.log(
			`  Cluster ${cluster.cluster_id}: ${cluster.files.length} files, ` +
				`${cluster.lines} lines, similarity ${(cluster.token_similarity * 100).toFixed(1)}%`
		);
		cluster.files.forEach((file) => {
			console.log(
				`    - ${file.path.replace(srcDir, '').substring(1)} (${file.symbol} @ ${file.line_start}-${file.line_end})`
			);
		});
	});

	process.exit(0);
}

main().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
