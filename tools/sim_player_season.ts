// sim_season.ts - reality-check tool for the simulator.
//
// Drives one synthetic season for a chosen position and depth-chart slot,
// then prints per-game stat lines and a season totals row. Lets a human
// eyeball whether yards, TDs, completion rates, sacks, and tackles fall in
// reasonable ranges. Pure Node, no DOM, no localStorage.
//
// Usage:
//   npx tsx tools/sim_player_season.ts --position QB
//   npx tsx tools/sim_player_season.ts --position RB --depth starter --strength 75
//   npx tsx tools/sim_player_season.ts --position WR --weeks 12 --seed 42
//
// Flags:
//   --position QB|RB|WR|TE|OL|DL|LB|CB|S|K   (default QB)
//   --depth starter|backup|bench             (default starter)
//   --strength NN     player team strength 1-100 (default 75)
//   --opp-base NN     opponent strength base 1-100 (default 60)
//   --opp-range NN    opponent strength variance (default 25)
//   --weeks N         number of regular-season games (default 17)
//   --seed N          RNG seed for reproducibility (default 0xCAFEBABE)
//   --core NN         all six core stats set to this value (default 75)

import {
	Player,
	Position,
	accumulateGameStats,
	clampStat,
	createPlayer,
	getPositionBucket,
} from '../src/player.js';
import { Team, generateHighSchoolTeam } from '../src/team.js';
import { simulateGame, GameResult } from '../src/week_sim/game.js';
import { seedDefaultRng, randInt } from '../src/core/rng.js';

//============================================
// Parsed CLI configuration. Defaults chosen to feel like a starter on a
// solid team facing average opponents over an NFL-length season.
interface SimConfig {
	position: Position;
	depth: 'starter' | 'backup' | 'bench';
	strength: number;
	oppBase: number;
	oppRange: number;
	weeks: number;
	seed: number;
	coreValue: number;
}

//============================================
// Allowed positions for the --position flag.
const VALID_POSITIONS: readonly Position[] = [
	'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P',
];

//============================================
// Parse argv into a typed config. Unknown flags throw so the user gets a
// clear error instead of a silent default.
function parseArgs(argv: readonly string[]): SimConfig {
	const cfg: SimConfig = {
		position: 'QB',
		depth: 'starter',
		strength: 75,
		oppBase: 60,
		oppRange: 25,
		weeks: 17,
		seed: 0xCAFEBABE,
		coreValue: 75,
	};
	for (let i = 0; i < argv.length; i++) {
		const flag: string = argv[i];
		const next: string | undefined = argv[i + 1];
		switch (flag) {
			case '--position':
				if (next === undefined || !VALID_POSITIONS.includes(next as Position)) {
					throw new Error(`--position must be one of ${VALID_POSITIONS.join(', ')}`);
				}
				cfg.position = next as Position;
				i++;
				break;
			case '--depth':
				if (next !== 'starter' && next !== 'backup' && next !== 'bench') {
					throw new Error('--depth must be starter | backup | bench');
				}
				cfg.depth = next;
				i++;
				break;
			case '--strength':
				cfg.strength = parseIntFlag(flag, next);
				i++;
				break;
			case '--opp-base':
				cfg.oppBase = parseIntFlag(flag, next);
				i++;
				break;
			case '--opp-range':
				cfg.oppRange = parseIntFlag(flag, next);
				i++;
				break;
			case '--weeks':
				cfg.weeks = parseIntFlag(flag, next);
				i++;
				break;
			case '--seed':
				cfg.seed = parseIntFlag(flag, next);
				i++;
				break;
			case '--core':
				cfg.coreValue = parseIntFlag(flag, next);
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
function printUsage(): void {
	console.log('Usage: npx tsx tools/sim_player_season.ts [flags]');
	console.log('  --position QB|RB|WR|TE|OL|DL|LB|CB|S|K|P  (default QB)');
	console.log('  --depth starter|backup|bench              (default starter)');
	console.log('  --strength 1-100   player team strength   (default 75)');
	console.log('  --opp-base 1-100   opponent strength base (default 60)');
	console.log('  --opp-range NN     opponent variance      (default 25)');
	console.log('  --weeks N          games to simulate      (default 17)');
	console.log('  --seed N           RNG seed               (default 0xCAFEBABE)');
	console.log('  --core 1-100       all core stats set to  (default 75)');
}

//============================================
// Build a synthetic player with predictable, position-appropriate stats so
// the output reads as a realistic test subject rather than a brand-new
// character with random birth stats.
function buildSyntheticPlayer(cfg: SimConfig): Player {
	const player: Player = createPlayer('Reality', 'Check');
	player.position = cfg.position;
	player.positionBucket = getPositionBucket(cfg.position);
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
// Generate a per-week opponent strength so the season has a realistic mix
// of soft and tough matchups instead of identical opponents every week.
function rollOpponentStrength(cfg: SimConfig): number {
	const half: number = Math.floor(cfg.oppRange / 2);
	const lo: number = clampStat(cfg.oppBase - half);
	const hi: number = clampStat(cfg.oppBase + half);
	return randInt(lo, hi);
}

//============================================
// Stats relevant to the player's position, in print order.
function statKeysForBucket(bucket: Player['positionBucket']): readonly string[] {
	if (bucket === 'passer') {
		return ['attempts', 'completions', 'passYards', 'passTds', 'passInts'];
	}
	if (bucket === 'runner_receiver') {
		return ['carries', 'rushYards', 'rushTds', 'targets', 'receptions', 'recYards', 'recTds'];
	}
	if (bucket === 'defender') {
		return ['tackles', 'sacks', 'ints'];
	}
	if (bucket === 'kicker') {
		return ['fgMade', 'fgAttempts', 'xpMade', 'xpAttempts'];
	}
	// Linemen have no individual stats; show games-played-style placeholder.
	return [];
}

//============================================
// Pull a numeric stat from a StatLine, defaulting to 0 when the position
// does not produce that key.
function statNum(line: Record<string, number | string>, key: string): number {
	const v: number | string | undefined = line[key];
	return typeof v === 'number' ? v : 0;
}

//============================================
function pad(s: string | number, width: number, right: boolean = true): string {
	const text: string = typeof s === 'number' ? String(s) : s;
	if (text.length >= width) {
		return text;
	}
	const fill: string = ' '.repeat(width - text.length);
	return right ? fill + text : text + fill;
}

//============================================
// Print the per-game table header so each column lines up over its data.
function printHeader(keys: readonly string[]): void {
	const cols: string[] = [
		pad('Wk', 3),
		pad('Result', 8, false),
		pad('Score', 9, false),
		pad('Rate', 5, false),
		pad('Grade', 6, false),
	];
	for (const k of keys) {
		cols.push(pad(k, Math.max(5, k.length)));
	}
	console.log(cols.join(' '));
	console.log('-'.repeat(cols.join(' ').length));
}

//============================================
function printGameRow(
	week: number,
	keys: readonly string[],
	result: GameResult,
): void {
	const cols: string[] = [
		pad(week, 3),
		pad(result.result.toUpperCase(), 8, false),
		pad(`${result.teamScore}-${result.opponentScore}`, 9, false),
		pad(result.playerRating.slice(0, 4), 5, false),
		pad(result.playerGrade, 6, false),
	];
	for (const k of keys) {
		cols.push(pad(statNum(result.playerStatLine, k), Math.max(5, k.length)));
	}
	console.log(cols.join(' '));
}

//============================================
// Print season totals by reading off the player's accumulated seasonStats
// rather than re-summing the per-game lines (verifies accumulation works).
function printSeasonTotals(player: Player, keys: readonly string[], wins: number, losses: number): void {
	console.log('');
	console.log(`Season totals (${player.position}, ${player.depthChart}, team strength ${player.teamStrength}):`);
	const stats: Record<string, number> = player.seasonStats as unknown as Record<string, number>;
	console.log(`  Record: ${wins}-${losses}`);
	console.log(`  Games played: ${stats.gamesPlayed}`);
	console.log(`  Total yards: ${stats.totalYards}`);
	console.log(`  Total touchdowns: ${stats.totalTouchdowns}`);
	for (const k of keys) {
		const v: number = stats[k] ?? 0;
		console.log(`  ${pad(k, 14, false)} ${v}`);
	}
	if (player.positionBucket === 'passer' && stats.attempts > 0) {
		const pct: number = (stats.completions / stats.attempts) * 100;
		const ypa: number = stats.passYards / stats.attempts;
		console.log(`  Completion %:  ${pct.toFixed(1)}`);
		console.log(`  Yards/attempt: ${ypa.toFixed(2)}`);
	}
	if (player.positionBucket === 'runner_receiver' && stats.carries > 0) {
		const ypc: number = stats.rushYards / stats.carries;
		console.log(`  Yards/carry:   ${ypc.toFixed(2)}`);
	}
	if (player.positionBucket === 'kicker' && stats.fgAttempts > 0) {
		const fgPct: number = (stats.fgMade / stats.fgAttempts) * 100;
		console.log(`  FG %:          ${fgPct.toFixed(1)}`);
	}
}

//============================================
function main(): void {
	const cfg: SimConfig = parseArgs(process.argv.slice(2));
	seedDefaultRng(cfg.seed);

	const player: Player = buildSyntheticPlayer(cfg);
	const team: Team = generateHighSchoolTeam(player.teamName);
	team.strength = cfg.strength;

	const keys: readonly string[] = statKeysForBucket(player.positionBucket);

	console.log('');
	console.log(`Reality-check season: ${cfg.position} (${cfg.depth}), seed=0x${cfg.seed.toString(16)}`);
	console.log(`Team strength: ${cfg.strength}, opponent base: ${cfg.oppBase} +- ${Math.floor(cfg.oppRange / 2)}`);
	console.log('');

	if (keys.length > 0) {
		printHeader(keys);
	} else {
		console.log('Note: position has no individual stats; printing record only.');
		console.log(pad('Wk', 3) + ' ' + pad('Result', 8, false) + ' ' + pad('Score', 9, false));
	}

	let wins: number = 0;
	let losses: number = 0;
	for (let week = 1; week <= cfg.weeks; week++) {
		const oppStrength: number = rollOpponentStrength(cfg);
		const result: GameResult = simulateGame(player, team, oppStrength, false);
		accumulateGameStats(player, result.playerStatLine);
		if (result.result === 'win') {
			wins++;
		} else {
			losses++;
		}
		if (keys.length > 0) {
			printGameRow(week, keys, result);
		} else {
			console.log(pad(week, 3) + ' ' + pad(result.result.toUpperCase(), 8, false) + ' ' + pad(`${result.teamScore}-${result.opponentScore}`, 9, false));
		}
	}

	printSeasonTotals(player, keys, wins, losses);
}

main();
