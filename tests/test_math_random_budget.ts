// test_math_random_budget.ts - ratchet on Math.random() in the simulation tree.
//
// The simulation tree owns all gameplay randomness and must eventually flow
// through src/core/rng.ts. Removing the existing 58 call sites in one patch
// is sideways work; instead, this script records the current baseline and
// fails only if the count grows. The baseline is ratcheted down at each
// milestone (M3 handler migration, M4 simulator split, M5 final cleanup).
//
// Run with: npm run test:node -- --test-name-pattern='math_random_budget'
//
// Updating the baseline: when a patch lowers the count, change the
// SIM_TREE_BUDGET constant below to match the new actual count and note the
// reason in docs/CHANGELOG.md. Increases are not allowed.

/// <reference types="node" />

import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

//============================================
// Simulation tree as defined in the plan. Direct Math.random() in any of
// these paths counts against the budget.
const SIM_TREE: readonly string[] = [
  "src/core",
  "src/weekly",
  "src/simulator",
  "src/clutch",
  "src/season",
  "src/high_school",
  "src/college",
  "src/nfl_handlers",
];

//============================================
// Current allowed budget. Lower this number when a patch removes call sites
// and document the drop in docs/CHANGELOG.md. Never raise it.
const SIM_TREE_BUDGET: number = 0;

//============================================
// Resolve repo root from this file's location (tests/test_math_random_budget.ts).
function repoRoot(): string {
  const here: string = url.fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(here), "..");
}

//============================================
// Walk a directory and yield every .ts file path beneath it.
function* walkTs(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full: string = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkTs(full);
    } else if (entry.isFile() && full.endsWith(".ts")) {
      yield full;
    }
  }
}

//============================================
// Strip line comments and very simple block-comment noise so we count only
// real call sites. We keep this lightweight rather than parsing TypeScript:
// the regex below matches `Math.random(` so trailing identifiers like
// `Math.randomFoo` are excluded. Comment stripping handles the // form;
// block comments are rare in this repo.
function countCallSites(filePath: string): number {
  const text: string = fs.readFileSync(filePath, "utf8");
  let count: number = 0;
  for (const rawLine of text.split("\n")) {
    // Drop everything after a // comment marker before counting.
    const slashIdx: number = rawLine.indexOf("//");
    const code: string = slashIdx >= 0 ? rawLine.slice(0, slashIdx) : rawLine;
    // Match the actual call: literal "Math.random(".
    const matches: RegExpMatchArray | null = code.match(/Math\.random\(/g);
    if (matches !== null) {
      count += matches.length;
    }
  }
  return count;
}

//============================================
// Aggregate a per-file count across the simulation tree, returning both the
// total and a sorted detail list for diagnostic printing on failure.
function tallySimTree(root: string): {
  total: number;
  details: { file: string; count: number }[];
} {
  const details: { file: string; count: number }[] = [];
  let total: number = 0;
  for (const rel of SIM_TREE) {
    const dir: string = path.join(root, rel);
    for (const file of walkTs(dir)) {
      const count: number = countCallSites(file);
      if (count > 0) {
        details.push({ file: path.relative(root, file), count });
        total += count;
      }
    }
  }
  details.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
  return { total, details };
}

//============================================
void test("boundary check: Math.random budget in simulation tree", () => {
  const root: string = repoRoot();
  const { total, details } = tallySimTree(root);
  if (total > SIM_TREE_BUDGET) {
    const lines: string[] = [];
    lines.push(`Math.random budget exceeded: found ${total}, max ${SIM_TREE_BUDGET}.`);
    lines.push("New simulation code must use src/core/rng.ts. Top offenders:");
    for (const { file, count } of details.slice(0, 10)) {
      lines.push(`  ${count.toString().padStart(3, " ")}  ${file}`);
    }
    throw new Error(lines.join("\n"));
  }
  // Note: if total < SIM_TREE_BUDGET, the budget can be tightened. We do not
  // fail the test, but we also do not emit a warning here -- node:test owns
  // reporter output, and a warning line would mix into PASS output.
});
