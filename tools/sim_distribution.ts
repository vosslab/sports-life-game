// sim_distribution.ts - run many synthetic seasons and print distribution
// stats per position. Lets a human spot variance and outlier issues that a
// single season cannot reveal (e.g. "QB completion % is 78 +/- 1 across
// 50 seasons -- is that too tight?").
//
// Usage:
//   npx tsx tools/sim_distribution.ts
//   npx tsx tools/sim_distribution.ts --position QB --runs 100
//   npx tsx tools/sim_distribution.ts --position all --runs 30 --weeks 17
//
// Flags:
//   --position QB|RB|WR|TE|LB|CB|S|K|all   (default all)
//   --runs N        seasons per position (default 30)
//   --weeks N       games per season (default 17)
//   --depth starter|backup|bench (default starter)
//   --strength N    player team strength (default 75)
//   --core N        all core stats set to (default 75)
//   --base-seed N   first seed; each run uses base+i (default 1000)

import {
	Player,
	Position,
	accumulateGameStats,
	clampStat,
	createEmptySeasonStats,
	createPlayer,
	getPositionBucket,
} from '../src/player.js';
import { Team, generateHighSchoolTeam } from '../src/team.js';
import { simulateGame } from '../src/week_sim/game.js';
import { seedDefaultRng, randInt } from '../src/core/rng.js';

//============================================
// Position groups for the "all" mode. Linemen are excluded because the
// simulator generates no individual stats for them.
const POSITION_GROUPS: readonly Position[] = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'S', 'K'];

interface DistConfig {
	positions: readonly Position[];
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
function parseArgs(argv: readonly string[]): DistConfig {
	let positions: readonly Position[] = POSITION_GROUPS;
	let runs: number = 30;
	let weeks: number = 17;
	let depth: 'starter' | 'backup' | 'bench' = 'starter';
	let strength: number = 75;
	let coreValue: number = 75;
	let baseSeed: number = 1000;

	for (let i = 0; i < argv.length; i++) {
		const flag: string = argv[i];
		const next: string | undefined = argv[i + 1];
		switch (flag) {
			case '--position':
				if (next === 'all') {
					positions = POSITION_GROUPS;
				} else if (next !== undefined) {
					positions = [next as Position];
				}
				i++;
				break;
			case '--runs':
				runs = parseIntFlag(flag, next);
				i++;
				break;
			case '--weeks':
				weeks = parseIntFlag(flag, next);
				i++;
				break;
			case '--depth':
				if (next !== 'starter' && next !== 'backup' && next !== 'bench') {
					throw new Error('--depth must be starter | backup | bench');
				}
				depth = next;
				i++;
				break;
			case '--strength':
				strength = parseIntFlag(flag, next);
				i++;
				break;
			case '--core':
				coreValue = parseIntFlag(flag, next);
				i++;
				break;
			case '--base-seed':
				baseSeed = parseIntFlag(flag, next);
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
	return { positions, runs, weeks, depth, strength, coreValue, baseSeed };
}

//============================================
function printUsage(): void {
	console.log('Usage: npx tsx tools/sim_distribution.ts [flags]');
	console.log('  --position QB|RB|WR|TE|LB|CB|S|K|all  (default all)');
	console.log('  --runs N        seasons per position  (default 30)');
	console.log('  --weeks N       games per season       (default 17)');
	console.log('  --depth starter|backup|bench          (default starter)');
	console.log('  --strength N    player team strength   (default 75)');
	console.log('  --core N        core stat value        (default 75)');
	console.log('  --base-seed N   first RNG seed         (default 1000)');
}

//============================================
function buildPlayer(position: Position, cfg: DistConfig): Player {
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
// Run one synthetic season and return final season totals + record.
interface SeasonResult {
	wins: number;
	losses: number;
	stats: Record<string, number>;
}

function runOneSeason(position: Position, seed: number, cfg: DistConfig): SeasonResult {
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
// Headline stats per position bucket. Picked to give a quick "do these
// numbers look like real football?" gut-check.
function reportKeysForBucket(bucket: Player['positionBucket']): readonly string[] {
	if (bucket === 'passer') {
		return ['passYards', 'passTds', 'passInts', 'completions', 'attempts'];
	}
	if (bucket === 'runner_receiver') {
		return ['rushYards', 'rushTds', 'carries', 'recYards', 'recTds', 'receptions'];
	}
	if (bucket === 'defender') {
		return ['tackles', 'sacks', 'ints'];
	}
	if (bucket === 'kicker') {
		return ['fgMade', 'fgAttempts', 'xpMade'];
	}
	return [];
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
// Compute mean / min / max / standard deviation for an array of numbers.
function summarize(values: readonly number[]): { mean: number; min: number; max: number; stddev: number } {
	if (values.length === 0) {
		return { mean: 0, min: 0, max: 0, stddev: 0 };
	}
	const sum: number = values.reduce((a, b) => a + b, 0);
	const mean: number = sum / values.length;
	let min: number = values[0];
	let max: number = values[0];
	let sqDevSum: number = 0;
	for (const v of values) {
		if (v < min) min = v;
		if (v > max) max = v;
		sqDevSum += (v - mean) * (v - mean);
	}
	const stddev: number = Math.sqrt(sqDevSum / values.length);
	return { mean, min, max, stddev };
}

//============================================
function reportPosition(position: Position, results: SeasonResult[]): void {
	const bucket = getPositionBucket(position);
	const keys: readonly string[] = reportKeysForBucket(bucket);
	if (keys.length === 0) {
		return;
	}

	console.log('');
	console.log(`=== ${position} (${results.length} seasons) ===`);

	const winsArr: number[] = results.map((r) => r.wins);
	const winSum = summarize(winsArr);
	console.log(`  Wins:          mean=${winSum.mean.toFixed(1)}  min=${winSum.min}  max=${winSum.max}  stddev=${winSum.stddev.toFixed(2)}`);

	console.log(
		'  ' + pad('stat', 14, false)
		+ pad('mean', 9)
		+ pad('min', 7)
		+ pad('max', 7)
		+ pad('stddev', 9),
	);
	for (const key of keys) {
		const series: number[] = results.map((r) => r.stats[key] ?? 0);
		const s = summarize(series);
		console.log(
			'  ' + pad(key, 14, false)
			+ pad(s.mean, 9)
			+ pad(s.min, 7)
			+ pad(s.max, 7)
			+ pad(s.stddev, 9),
		);
	}

	// Bucket-specific derived ratios with their own variance lines.
	if (bucket === 'passer') {
		const compPctArr: number[] = results
			.filter((r) => r.stats.attempts > 0)
			.map((r) => (r.stats.completions / r.stats.attempts) * 100);
		const ypaArr: number[] = results
			.filter((r) => r.stats.attempts > 0)
			.map((r) => r.stats.passYards / r.stats.attempts);
		const cs = summarize(compPctArr);
		const ys = summarize(ypaArr);
		console.log(`  Completion %:  mean=${cs.mean.toFixed(1)}  min=${cs.min.toFixed(1)}  max=${cs.max.toFixed(1)}  stddev=${cs.stddev.toFixed(2)}`);
		console.log(`  Yards/attempt: mean=${ys.mean.toFixed(2)}  min=${ys.min.toFixed(2)}  max=${ys.max.toFixed(2)}  stddev=${ys.stddev.toFixed(2)}`);
	}
	if (bucket === 'runner_receiver' && position === 'RB') {
		const ypcArr: number[] = results
			.filter((r) => r.stats.carries > 0)
			.map((r) => r.stats.rushYards / r.stats.carries);
		const ys = summarize(ypcArr);
		console.log(`  Yards/carry:   mean=${ys.mean.toFixed(2)}  min=${ys.min.toFixed(2)}  max=${ys.max.toFixed(2)}  stddev=${ys.stddev.toFixed(2)}`);
	}
	if (bucket === 'kicker') {
		const fgPctArr: number[] = results
			.filter((r) => r.stats.fgAttempts > 0)
			.map((r) => (r.stats.fgMade / r.stats.fgAttempts) * 100);
		const fs = summarize(fgPctArr);
		console.log(`  FG %:          mean=${fs.mean.toFixed(1)}  min=${fs.min.toFixed(1)}  max=${fs.max.toFixed(1)}  stddev=${fs.stddev.toFixed(2)}`);
	}
	// avoid unused variable warning when createEmptySeasonStats is imported
	void createEmptySeasonStats;
}

//============================================
function main(): void {
	const cfg: DistConfig = parseArgs(process.argv.slice(2));

	console.log('');
	console.log(`Distribution check: ${cfg.runs} seasons x ${cfg.weeks} games per position`);
	console.log(`Depth: ${cfg.depth}, team strength: ${cfg.strength}, core stats: ${cfg.coreValue}`);

	for (const position of cfg.positions) {
		const results: SeasonResult[] = [];
		for (let i = 0; i < cfg.runs; i++) {
			results.push(runOneSeason(position, cfg.baseSeed + i, cfg));
		}
		reportPosition(position, results);
	}
}

main();
