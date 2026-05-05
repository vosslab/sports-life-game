// sim_conference_season.ts - reality-check tool for the league/season layer.
//
// Uses the real gameplay builders and simulators (buildHighSchoolSeasonConfigured,
// simulateGameBetweenTeams) to validate season mechanics. Supports parameterized
// team count and game count for flexible analysis.
//
// Pure Node, no DOM, no localStorage. Calls only the season simulation layer.
//
// Usage:
//   npx tsx tools/sim_conference_season.ts
//   npx tsx tools/sim_conference_season.ts --seed 42 --conference-teams 10 --games-per-team 9
//   npx tsx tools/sim_conference_season.ts --runs 100 --quiet
//   npx tsx tools/sim_conference_season.ts --details
//   npx tsx tools/sim_conference_season.ts --box-scores --awards
//   npx tsx tools/sim_conference_season.ts --json | python3 -c "import json,sys; json.loads(sys.stdin.read())"
//
// Flags:
//   --seed N                   RNG seed (default random)
//   --player-strength N        1-100 player team strength (default 75)
//   --player-name "Name"       Player team display name (default: random)
//   --player-mascot "X"        Player team mascot (default: random)
//   --runs N                   Run N seasons; aggregate stats if N > 1 (default 1)
//   --conference-teams N       Conference size (4-32, even only, default 8)
//   --games-per-team N         Games per team (1 to 2*teams-2, default 10)
//   --nonconference-teams N    Non-conf opponent pool (default same as conference-teams)
//   --quiet                    Skip per-season standings table
//   --details                  Print player team schedule with results
//   --box-scores               Print all conference games in detail
//   --rankings                 Print power ranking (record + diff + strength)
//   --awards                   Print heuristic awards (OPOY/DPOY/Breakout)
//   --json                     Output JSON (suppresses other stdout)

import process from 'node:process';

import { LeagueSeason } from '../src/season/season_model.js';
import { SeasonGame } from '../src/season/game_model.js';
import { seedDefaultRng } from '../src/core/rng.js';
import {
	buildHighSchoolSeasonConfigured,
	type HighSchoolSeasonConfig,
} from '../src/high_school/hs_season_builder.js';
import { simulateGameBetweenTeams } from '../src/season/season_simulator.js';
import { generateOpponentName } from '../src/team.js';

import type { SimConfig, AggregateStats } from './sim_conf/types.js';
import {
	printStandings, printAggregateSummary, printAggregatePlayerStats,
	printPlayerTeamSchedule, printBoxScores, printPowerRanking, printAwards,
} from './sim_conf/display.js';
import {
	aggregateWinners, aggregatePlayerTeamStats, buildJsonOutput,
} from './sim_conf/aggregators.js';

// Default seed is the current time so back-to-back runs differ.
const DEFAULT_SEED: number = (Date.now() & 0xFFFFFFFF) >>> 0;

const DEFAULT_CONFIG: SimConfig = {
	seed: DEFAULT_SEED,
	playerStrength: 75,
	// Empty defaults trigger a random "Name Mascot" pick after RNG seeding.
	// Pass --player-name / --player-mascot to override.
	playerName: '',
	playerMascot: '',
	runs: 1,
	quiet: false,
	details: false,
	boxScores: false,
	rankings: false,
	awards: false,
	json: false,
	conferenceTeams: 8,
	gamesPerTeam: 10,
	nonConferenceTeams: 8,
};

//============================================
function parseArgs(argv: readonly string[]): SimConfig {
	const cfg: SimConfig = { ...DEFAULT_CONFIG };
	const args = argv.slice(2);
	for (let i = 0; i < args.length; i++) {
		const flag = args[i];
		const next = args[i + 1];
		if (flag === '--help' || flag === '-h') {
			printUsage();
			process.exit(0);
		}
		if (flag === '--quiet') {
			cfg.quiet = true;
			continue;
		}
		if (flag === '--details') {
			cfg.details = true;
			continue;
		}
		if (flag === '--box-scores') {
			cfg.boxScores = true;
			continue;
		}
		if (flag === '--rankings') {
			cfg.rankings = true;
			continue;
		}
		if (flag === '--awards') {
			cfg.awards = true;
			continue;
		}
		if (flag === '--json') {
			cfg.json = true;
			continue;
		}
		if (flag === '--conference-teams') {
			const n = clampInt('--conference-teams', next, 4, 32);
			if (n % 2 !== 0) {
				console.error('--conference-teams must be even (required for round-robin)');
				process.exit(2);
			}
			cfg.conferenceTeams = n;
			i++;
		} else if (flag === '--games-per-team') {
			cfg.gamesPerTeam = clampInt('--games-per-team', next, 1, 62);
			i++;
		} else if (flag === '--nonconference-teams') {
			cfg.nonConferenceTeams = clampInt('--nonconference-teams', next, 0, 32);
			i++;
		} else if (flag === '--seed') {
			cfg.seed = parseIntFlag('--seed', next);
			i++;
		} else if (flag === '--player-strength') {
			cfg.playerStrength = clampInt('--player-strength', next, 1, 100);
			i++;
		} else if (flag === '--player-name') {
			cfg.playerName = next ?? '';
			i++;
		} else if (flag === '--player-mascot') {
			cfg.playerMascot = next ?? '';
			i++;
		} else if (flag === '--runs') {
			cfg.runs = clampInt('--runs', next, 1, 10000);
			i++;
		} else {
			console.error(`Unknown flag: ${flag}`);
			printUsage();
			process.exit(2);
		}
	}

	// Validate games-per-team is not more than double round-robin
	const maxGames = (cfg.conferenceTeams - 1) * 2;
	if (cfg.gamesPerTeam > maxGames) {
		console.error(
			`--games-per-team ${cfg.gamesPerTeam} exceeds max for ${cfg.conferenceTeams} teams `
			+ `(double round-robin: ${maxGames})`,
		);
		process.exit(2);
	}

	return cfg;
}

//============================================
function parseIntFlag(name: string, raw: string | undefined): number {
	if (raw === undefined) {
		console.error(`Missing value for ${name}`);
		process.exit(2);
	}
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n)) {
		console.error(`Invalid integer for ${name}: ${raw}`);
		process.exit(2);
	}
	return n;
}

function clampInt(name: string, raw: string | undefined, min: number, max: number): number {
	const n = parseIntFlag(name, raw);
	if (n < min || n > max) {
		console.error(`${name} must be between ${min} and ${max} (got ${n})`);
		process.exit(2);
	}
	return n;
}

//============================================
function printUsage(): void {
	console.log('Usage: npx tsx tools/sim_conference_season.ts [flags]');
	console.log('  --seed N                   RNG seed (default random)');
	console.log('  --player-strength N        1-100 player team strength (default 75)');
	console.log('  --player-name "Name"       Player team display name (default: random)');
	console.log('  --player-mascot "X"        Player team mascot (default: random)');
	console.log('  --runs N                   Run N seasons; aggregate stats if N > 1 (default 1)');
	console.log('  --conference-teams N       Conference size (4-32, even only, default 8)');
	console.log('  --games-per-team N         Games per team (default 10)');
	console.log('  --nonconference-teams N    Non-conf opponent pool (default same as conference-teams)');
	console.log('  --quiet                    Skip per-season standings table');
	console.log('  --details                  Print player team schedule with results');
	console.log('  --box-scores               Print all conference games in detail');
	console.log('  --rankings                 Print power ranking (record + diff + strength)');
	console.log('  --awards                   Print heuristic awards (OPOY/DPOY/Breakout)');
	console.log('  --json                     Output JSON (suppresses other stdout)');
}

//============================================
// Run one full season to completion using the real game simulator.
function runSeason(cfg: SimConfig): LeagueSeason {
	const config: HighSchoolSeasonConfig = {
		playerTeamName: cfg.playerName,
		playerMascot: cfg.playerMascot,
		playerStrength: cfg.playerStrength,
		conferenceTeams: cfg.conferenceTeams,
		gamesPerTeam: cfg.gamesPerTeam,
		nonConferenceTeams: cfg.nonConferenceTeams,
	};

	const season = buildHighSchoolSeasonConfigured(config);

	// Loop: advance to next week, simulate every game in that week.
	// Using the real simulateGameBetweenTeams from season_simulator.ts
	// Note: In the game engine, player games are handled separately. Here we simulate
	// all games using the same strength-based logic.
	while (season.advanceWeek()) {
		const games = season.getGamesForWeek(season.currentWeek);
		for (const game of games) {
			// Skip already-finalized games
			if (game.status === 'final') {
				continue;
			}
			simulateGameBetweenTeams(season, game);
		}
	}

	return season;
}

//============================================
function main(): void {
	const cfg = parseArgs(process.argv);
	seedDefaultRng(cfg.seed);

	// Fill empty player name/mascot from the same opponent-name pool used
	// for generated teams. Done after RNG seeding so --seed reproduces the
	// same default name.
	if (cfg.playerName === '' || cfg.playerMascot === '') {
		const random = generateOpponentName();
		const parts = random.split(' ');
		const mascot = parts.pop() || 'Team';
		const name = parts.join(' ') || 'Unknown';
		if (cfg.playerName === '') cfg.playerName = name;
		if (cfg.playerMascot === '') cfg.playerMascot = mascot;
	}

	if (!cfg.json) {
		console.log(
			`sim_conference_season: seed=${cfg.seed}, runs=${cfg.runs}, `
			+ `conf-teams=${cfg.conferenceTeams}, games=${cfg.gamesPerTeam}, `
			+ `player=${cfg.playerName} ${cfg.playerMascot} (str ${cfg.playerStrength})`,
		);
	}

	const seasons: LeagueSeason[] = [];
	for (let i = 0; i < cfg.runs; i++) {
		const season = runSeason(cfg);
		seasons.push(season);
		if (!cfg.json && !cfg.quiet && cfg.runs <= 5) {
			console.log('');
			console.log(`--- Season ${i + 1} ---`);
			printStandings(season, 'player');
		}
	}

	// Handle JSON output
	if (cfg.json) {
		const output = buildJsonOutput(cfg, seasons);
		console.log(JSON.stringify(output, null, 2));
		return;
	}

	// Handle single-season detail modes
	if (cfg.runs === 1 && seasons.length > 0) {
		const season = seasons[0];
		if (!cfg.quiet) {
			printStandings(season, 'player');
		}
		if (cfg.details) {
			printPlayerTeamSchedule(season);
		}
		if (cfg.boxScores) {
			printBoxScores(season);
		}
		if (cfg.rankings) {
			printPowerRanking(season);
		}
		if (cfg.awards) {
			printAwards(season);
		}
	}

	// Handle aggregate modes (multi-run only)
	if (cfg.runs > 1) {
		const playerTeamFullName = `${cfg.playerName} ${cfg.playerMascot}`;
		const wins = aggregateWinners(seasons);
		printAggregateSummary(wins, cfg.runs, playerTeamFullName);
		const stats = aggregatePlayerTeamStats(seasons);
		printAggregatePlayerStats(stats, cfg.runs);
	}
}

main();
