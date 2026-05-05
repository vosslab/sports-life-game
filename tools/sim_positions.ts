// sim_positions.ts - side-by-side comparison across all positions.
//
// Architecture validation: this script consumes simulator + season + RNG
// modules without importing main.ts, ui.ts, render code, or anything DOM.
// It demonstrates that the simulator now has a clean programmatic interface.
// (The same is true of sim_season.ts and sim_distribution.ts.)
//
// Reality check: prints one row per position with mean and stddev for the
// stats that position is supposed to produce, then flags two anomalies that
// would otherwise be invisible:
//   - identical (mean, stddev) tuples across positions ("flat-by-bucket")
//   - suspiciously tight variance (stddev/mean < FLAT_VARIANCE_RATIO)
//
// Usage:
//   npx tsx tools/sim_positions.ts
//   npx tsx tools/sim_positions.ts --runs 50 --weeks 17
//   npx tsx tools/sim_positions.ts --base-seed 7000

import {
	Player,
	Position,
	accumulateGameStats,
	clampStat,
	createPlayer,
	getPositionBucket,
} from '../src/player.js';
import { Team, generateHighSchoolTeam } from '../src/team.js';
import { simulateGame } from '../src/week_sim/game.js';
import { seedDefaultRng, randInt } from '../src/core/rng.js';

//============================================
// Positions to compare. P (punter) is included for completeness even
// though the kicker bucket only generates FG/XP stats.
const POSITIONS: readonly Position[] = [
	'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P',
];

//============================================
// Stat keys we report for the comparison table. Ordered for readability;
// any stat a position does not produce will simply read 0.
const COMPARISON_STATS: readonly string[] = [
	'totalYards',
	'totalTouchdowns',
	'passYards',
	'rushYards',
	'recYards',
	'tackles',
	'sacks',
	'ints',
	'fgMade',
	'fgAttempts',
];

//============================================
// stddev/mean ratios under this threshold are flagged as suspiciously flat.
// 0.05 means "this position produces basically the same number every season."
const FLAT_VARIANCE_RATIO: number = 0.05;

interface PositionsConfig {
	runs: number;
	weeks: number;
	depth: 'starter' | 'backup' | 'bench';
	strength: number;
	coreValue: number;
	baseSeed: number;
}

//============================================
function parseIntFlag(flag: string, raw: string | undefined): number {
	if (raw === undefined) {
		throw new Error(`${flag} requires a value`);
	}
	const n: number = Number(raw);
	if (!Number.isFinite(n)) {
		throw new Error(`${flag} value "${raw}" is not a number`);
	}
	return n;
}

//============================================
function parseArgs(argv: readonly string[]): PositionsConfig {
	const cfg: PositionsConfig = {
		runs: 30,
		weeks: 17,
		depth: 'starter',
		strength: 75,
		coreValue: 75,
		baseSeed: 5000,
	};
	for (let i = 0; i < argv.length; i++) {
		const flag: string = argv[i];
		const next: string | undefined = argv[i + 1];
		switch (flag) {
			case '--runs':       cfg.runs       = parseIntFlag(flag, next); i++; break;
			case '--weeks':      cfg.weeks      = parseIntFlag(flag, next); i++; break;
			case '--strength':   cfg.strength   = parseIntFlag(flag, next); i++; break;
			case '--core':       cfg.coreValue  = parseIntFlag(flag, next); i++; break;
			case '--base-seed':  cfg.baseSeed   = parseIntFlag(flag, next); i++; break;
			case '--depth':
				if (next !== 'starter' && next !== 'backup' && next !== 'bench') {
					throw new Error('--depth must be starter | backup | bench');
				}
				cfg.depth = next;
				i++;
				break;
			case '--help':
			case '-h':
				printUsage();
				process.exit(0);
				break;
			default:
				throw new Error(`unknown flag: ${flag} (use --help)`);
		}
	}
	return cfg;
}

//============================================
function printUsage(): void {
	console.log('Usage: npx tsx tools/sim_positions.ts [flags]');
	console.log('  --runs N        seasons per position   (default 30)');
	console.log('  --weeks N       games per season       (default 17)');
	console.log('  --depth starter|backup|bench           (default starter)');
	console.log('  --strength N    player team strength   (default 75)');
	console.log('  --core N        core stat value 1-100  (default 75)');
	console.log('  --base-seed N   first RNG seed         (default 5000)');
}

//============================================
// Build a synthetic player at the chosen position with all six core stats
// pinned to the same value, so any variance in output stats traces back to
// the simulator's RNG and not to player attribute differences.
function buildPlayer(position: Position, cfg: PositionsConfig): Player {
	const player: Player = createPlayer('Reality', 'Check');
	player.position = position;
	player.positionBucket = getPositionBucket(position);
	player.depthChart = cfg.depth;
	player.phase = 'nfl';
	player.age = 24;

	const v: number = clampStat(cfg.coreValue);
	player.core.athleticism = v;
	player.core.technique = v;
	player.core.footballIq = v;
	player.core.discipline = v;
	player.core.health = v;
	player.core.confidence = v;

	player.teamName = 'Reality Checkers';
	player.teamStrength = cfg.strength;
	return player;
}

//============================================
interface SeasonStats {
	wins: number;
	losses: number;
	stats: Record<string, number>;
}

//============================================
function runOneSeason(position: Position, seed: number, cfg: PositionsConfig): SeasonStats {
	seedDefaultRng(seed);
	const player: Player = buildPlayer(position, cfg);
	const team: Team = generateHighSchoolTeam(player.teamName);
	team.strength = cfg.strength;

	let wins: number = 0;
	let losses: number = 0;
	for (let w = 0; w < cfg.weeks; w++) {
		const oppStrength: number = randInt(45, 75);
		const result = simulateGame(player, team, oppStrength, false);
		accumulateGameStats(player, result.playerStatLine);
		if (result.result === 'win') {
			wins++;
		} else {
			losses++;
		}
	}
	const stats: Record<string, number> = player.seasonStats as unknown as Record<string, number>;
	return { wins, losses, stats };
}

//============================================
interface MeanStddev {
	mean: number;
	stddev: number;
}

function summarize(values: readonly number[]): MeanStddev {
	if (values.length === 0) {
		return { mean: 0, stddev: 0 };
	}
	const sum: number = values.reduce((a, b) => a + b, 0);
	const mean: number = sum / values.length;
	let sqDevSum: number = 0;
	for (const v of values) {
		sqDevSum += (v - mean) * (v - mean);
	}
	const stddev: number = Math.sqrt(sqDevSum / values.length);
	return { mean, stddev };
}

//============================================
function pad(s: string | number, width: number, right: boolean = true): string {
	const text: string = typeof s === 'number'
		? (Number.isInteger(s) ? String(s) : s.toFixed(1))
		: s;
	if (text.length >= width) {
		return text;
	}
	const fill: string = ' '.repeat(width - text.length);
	return right ? fill + text : text + fill;
}

//============================================
// Cell key for duplicate detection. Round to 1 decimal so trivial RNG
// differences do not mask real architectural duplication.
function cellKey(s: MeanStddev): string {
	return `${s.mean.toFixed(1)}|${s.stddev.toFixed(1)}`;
}

//============================================
// Print a single matrix row: position label + each comparison stat as
// "mean+/-stddev". Width-aligned so columns are scannable.
function printRow(position: Position, summaries: Record<string, MeanStddev>, wins: MeanStddev): void {
	const cells: string[] = [pad(position, 4, false)];
	cells.push(pad(`${wins.mean.toFixed(1)}-${(17 - wins.mean).toFixed(1)}`, 9, false));
	for (const stat of COMPARISON_STATS) {
		const s: MeanStddev = summaries[stat];
		const cell: string = `${s.mean.toFixed(0)}+-${s.stddev.toFixed(0)}`;
		cells.push(pad(cell, 11));
	}
	console.log(cells.join(' '));
}

//============================================
function printHeader(): void {
	const cells: string[] = [pad('Pos', 4, false), pad('W-L', 9, false)];
	for (const stat of COMPARISON_STATS) {
		cells.push(pad(stat, 11));
	}
	console.log(cells.join(' '));
	console.log('-'.repeat(cells.join(' ').length));
}

//============================================
// Detect (mean, stddev) tuples that are byte-identical across positions.
// This catches the LB/CB/S "uniform defender bucket" failure mode and any
// future regressions where the simulator collapses two roles into one.
function detectDuplicates(
	allSummaries: Record<Position, Record<string, MeanStddev>>,
): { stat: string; positions: Position[] }[] {
	const findings: { stat: string; positions: Position[] }[] = [];
	for (const stat of COMPARISON_STATS) {
		const buckets: Map<string, Position[]> = new Map();
		for (const pos of POSITIONS) {
			const s: MeanStddev = allSummaries[pos][stat];
			// Skip stats this position does not produce at all.
			if (s.mean === 0 && s.stddev === 0) {
				continue;
			}
			const key: string = cellKey(s);
			const existing: Position[] | undefined = buckets.get(key);
			if (existing === undefined) {
				buckets.set(key, [pos]);
			} else {
				existing.push(pos);
			}
		}
		for (const positions of buckets.values()) {
			if (positions.length >= 2) {
				findings.push({ stat, positions });
			}
		}
	}
	return findings;
}

//============================================
// Detect cells where stddev/mean is below FLAT_VARIANCE_RATIO. Flat
// variance suggests the simulator is producing the same number every
// season for that (position, stat), which is unrealistic.
interface FlatVarianceFinding {
	position: Position;
	stat: string;
	mean: number;
	stddev: number;
	ratio: number;
}

function detectFlatVariance(
	allSummaries: Record<Position, Record<string, MeanStddev>>,
): FlatVarianceFinding[] {
	const findings: FlatVarianceFinding[] = [];
	for (const pos of POSITIONS) {
		for (const stat of COMPARISON_STATS) {
			const s: MeanStddev = allSummaries[pos][stat];
			if (s.mean < 5) {
				// Skip near-zero stats; ratios are noise there.
				continue;
			}
			const ratio: number = s.stddev / s.mean;
			if (ratio < FLAT_VARIANCE_RATIO) {
				findings.push({ position: pos, stat, mean: s.mean, stddev: s.stddev, ratio });
			}
		}
	}
	return findings;
}

//============================================
function main(): void {
	const cfg: PositionsConfig = parseArgs(process.argv.slice(2));

	console.log('');
	console.log(`Position comparison: ${cfg.runs} seasons x ${cfg.weeks} games per position`);
	console.log(`Depth: ${cfg.depth}, team strength: ${cfg.strength}, core stats: ${cfg.coreValue}`);
	console.log(`Cells show "mean+-stddev" for each stat across ${cfg.runs} seeded seasons.`);
	console.log('');

	const allSummaries: Record<Position, Record<string, MeanStddev>> =
		{} as Record<Position, Record<string, MeanStddev>>;
	const winSummaries: Record<Position, MeanStddev> = {} as Record<Position, MeanStddev>;

	for (const position of POSITIONS) {
		const seasons: SeasonStats[] = [];
		for (let i = 0; i < cfg.runs; i++) {
			seasons.push(runOneSeason(position, cfg.baseSeed + i, cfg));
		}
		const perStat: Record<string, MeanStddev> = {};
		for (const stat of COMPARISON_STATS) {
			perStat[stat] = summarize(seasons.map((s) => s.stats[stat] ?? 0));
		}
		allSummaries[position] = perStat;
		winSummaries[position] = summarize(seasons.map((s) => s.wins));
	}

	printHeader();
	for (const pos of POSITIONS) {
		printRow(pos, allSummaries[pos], winSummaries[pos]);
	}

	const dupes = detectDuplicates(allSummaries);
	const flat = detectFlatVariance(allSummaries);

	console.log('');
	if (dupes.length === 0) {
		console.log('Duplicate distributions: none detected.');
	} else {
		console.log(`Duplicate distributions (${dupes.length} stats produce byte-identical mean+/-stddev across multiple positions):`);
		for (const f of dupes) {
			console.log(`  ${pad(f.stat, 16, false)} ${f.positions.join(', ')}`);
		}
	}

	console.log('');
	if (flat.length === 0) {
		console.log(`Flat variance (stddev/mean < ${FLAT_VARIANCE_RATIO}): none detected.`);
	} else {
		console.log(`Flat variance (stddev/mean < ${FLAT_VARIANCE_RATIO}, suspiciously deterministic across seeds):`);
		for (const f of flat) {
			console.log(
				`  ${pad(f.position, 4, false)} ${pad(f.stat, 16, false)}`
				+ ` mean=${f.mean.toFixed(1)} stddev=${f.stddev.toFixed(2)}`
				+ ` ratio=${f.ratio.toFixed(3)}`,
			);
		}
	}
}

main();
