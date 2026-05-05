// player.ts - player state: stats, age, position, injuries, career history.
//
// `Player` was previously a wide hand-written interface mixing identity,
// stats, career, and season-state fields. As of M3 it is composed from the
// narrow slices in src/player/ (PlayerIdentity, PlayerStatsBundle,
// PlayerCareer, PlayerSeasonState). This file still owns the runtime
// helpers (createPlayer, accumulateGameStats, etc.) and the data types that
// have not been moved yet (SeasonStatTotals, StoryFlags). New code should
// import the narrow slices from src/player/ rather than the composed Player.

import { randomAvatarConfig } from './avatar.js';
import { randInt } from './core/rng.js';
import { PlayerIdentity } from './player/identity.js';
import { PlayerStatsBundle } from './player/stats_bundle.js';
import { PlayerCareer } from './player/career.js';
import { PlayerSeasonState } from './player/season_state.js';

//============================================
// Core visible stats (0-100 scale)
export interface CoreStats {
	athleticism: number;
	technique: number;
	footballIq: number;
	discipline: number;
	health: number;
	confidence: number;
}

//============================================
// Career stats
export interface CareerStats {
	popularity: number;  // 0-100
	money: number;       // dollar amount
}

//============================================
// Hidden stats
export interface HiddenStats {
	size: number;        // 1-5 body frame (1=small, 5=large)
	leadership: number;  // 0-100
	durability: number;  // 0-100
}

//============================================
// Position, phase, depth-chart, and goal types now live with the narrow
// PlayerIdentity slice. Re-export them here so existing legacy importers of
// `./player.js` continue to compile while new code imports from
// `./player/index.js` directly.
export type {
	Position,
	PositionBucket,
	CareerPhase,
	DepthChartStatus,
} from './player/identity.js';
export type { SeasonGoal } from './player/season_state.js';
import type {
	Position,
	PositionBucket,
	CareerPhase,
	DepthChartStatus,
} from './player/identity.js';

//============================================
// Weekly game performance rating
export type PerformanceRating = 'poor' | 'below_average' | 'average' | 'good' | 'great' | 'elite';

//============================================
// Cumulative season stat totals (common + position-specific)
// Not every field is populated for every position; irrelevant fields stay 0.
export interface SeasonStatTotals {
	// Common
	gamesPlayed: number;
	totalYards: number;
	totalTouchdowns: number;
	// Passer
	passYards: number;
	passTds: number;
	passInts: number;
	completions: number;
	attempts: number;
	// Runner
	rushYards: number;
	carries: number;
	rushTds: number;
	fumbles: number;
	// Receiver / TE
	receptions: number;
	recYards: number;
	recTds: number;
	targets: number;
	// Defender
	tackles: number;
	sacks: number;
	ints: number;
	// Kicker
	fgMade: number;
	fgAttempts: number;
	xpMade: number;
	xpAttempts: number;
	// Awards
	playerOfTheWeekCount: number;
}

//============================================
// Create an empty season stat totals object
export function createEmptySeasonStats(): SeasonStatTotals {
	return {
		gamesPlayed: 0,
		totalYards: 0,
		totalTouchdowns: 0,
		passYards: 0,
		passTds: 0,
		passInts: 0,
		completions: 0,
		attempts: 0,
		rushYards: 0,
		carries: 0,
		rushTds: 0,
		fumbles: 0,
		receptions: 0,
		recYards: 0,
		recTds: 0,
		targets: 0,
		tackles: 0,
		sacks: 0,
		ints: 0,
		fgMade: 0,
		fgAttempts: 0,
		xpMade: 0,
		xpAttempts: 0,
		playerOfTheWeekCount: 0,
	};
}

//============================================
// Accumulate a game's stat line into player's season stats
export function accumulateGameStats(
	player: Player,
	statLine: Record<string, number | string>,
): void {
	const seasonStats = player.seasonStats;
	seasonStats.gamesPlayed += 1;
	// Also increment cumulative career games played
	player.careerGamesPlayed += 1;
	// Sum numeric stats by key name
	const numVal = (key: string): number => {
		const v = statLine[key];
		return typeof v === 'number' ? v : 0;
	};
	// Passer stats
	seasonStats.passYards += numVal('passYards');
	seasonStats.passTds += numVal('passTds');
	seasonStats.passInts += numVal('passInts');
	seasonStats.completions += numVal('completions');
	seasonStats.attempts += numVal('attempts');
	// Runner stats
	seasonStats.rushYards += numVal('rushYards');
	seasonStats.carries += numVal('carries');
	seasonStats.rushTds += numVal('rushTds');
	seasonStats.fumbles += numVal('fumbles');
	// Receiver / TE stats
	seasonStats.receptions += numVal('receptions');
	seasonStats.recYards += numVal('recYards');
	seasonStats.recTds += numVal('recTds');
	seasonStats.targets += numVal('targets');
	// Defender stats
	seasonStats.tackles += numVal('tackles');
	seasonStats.sacks += numVal('sacks');
	seasonStats.ints += numVal('ints');
	// Kicker stats
	seasonStats.fgMade += numVal('fgMade');
	seasonStats.fgAttempts += numVal('fgAttempts');
	seasonStats.xpMade += numVal('xpMade');
	seasonStats.xpAttempts += numVal('xpAttempts');
	// Compute total yards and TDs from position-specific stats
	seasonStats.totalYards = seasonStats.passYards + seasonStats.rushYards + seasonStats.recYards;
	seasonStats.totalTouchdowns = seasonStats.passTds + seasonStats.rushTds + seasonStats.recTds;
}

//============================================
// SeasonRecord lives with PlayerCareer; re-exported for legacy importers.
export type { SeasonRecord } from './player/career.js';

//============================================
// Persistent story flags for multi-step event chains
export interface StoryFlags {
	[key: string]: boolean;
}

//============================================
// Player is the composition of the four narrow slices in src/player/.
// New code should depend on the slice it actually needs (PlayerIdentity,
// PlayerStatsBundle, PlayerCareer, PlayerSeasonState) rather than the wide
// composed type. The wide type is preserved here only as a convenience for
// save/load and the still-uncleaved legacy importers.
export type Player =
	& PlayerIdentity
	& PlayerStatsBundle
	& PlayerCareer
	& PlayerSeasonState;

//============================================
// Random integer in range [min, max] inclusive
// Routes through the seeded RNG in src/core/rng.ts so the simulation tree
// produces deterministic output under a fixed seed.
export function randomInRange(min: number, max: number): number {
	return randInt(min, max);
}

//============================================
// Clamp a stat to 0-100
export function clampStat(value: number): number {
	return Math.max(0, Math.min(100, value));
}

//============================================
// Generate random birth stats
export function generateBirthStats(): { core: CoreStats; hidden: HiddenStats } {
	const core: CoreStats = {
		// Athleticism: higher variance, some kids are naturally gifted
		athleticism: randomInRange(20, 80),
		// Technique and Football IQ: start very low (learned skills)
		technique: randomInRange(0, 10),
		footballIq: randomInRange(0, 10),
		// Discipline: moderate range
		discipline: randomInRange(10, 50),
		// Health: generally starts high
		health: randomInRange(50, 100),
		// Confidence: moderate range
		confidence: randomInRange(20, 60),
	};

	const hidden: HiddenStats = {
		// Size: 1-5 body frame, random genetics
		size: randomInRange(1, 5),
		// Leadership: starts low
		leadership: randomInRange(5, 25),
		// Durability: mostly high for young players
		durability: randomInRange(50, 90),
	};

	return { core, hidden };
}

//============================================
// Create a new player with birth stats
export function createPlayer(firstName: string, lastName: string): Player {
	const { core, hidden } = generateBirthStats();

	const player: Player = {
		firstName,
		lastName,
		age: 0,

		phase: 'childhood',
		position: null,
		positionBucket: null,
		depthChart: 'bench',

		core,
		career: {
			popularity: 0,
			money: 0,
		},
		hidden,
		seasonStats: createEmptySeasonStats(),
		careerGamesPlayed: 0,

		currentSeason: 0,
		currentWeek: 0,
		seasonYear: new Date().getFullYear(),

		teamName: '',
		teamStrength: 50,

		storyFlags: {},
		storyLog: [],
		careerHistory: [],
		bigDecisions: [],

		gpa: 2.5,
		seasonGoal: 'grind',
		activeCrisis: null,
		scheduledCrises: [],
		crisisTriggeredThisSeason: false,
		relationships: {
			'Mom': randomInRange(60, 90),
			'Dad': randomInRange(50, 85),
			'Coach': 50,
		},

		recruitingStars: 0,
		collegeOffers: [],
		recruitingProfile: null,
		draftStock: 0,

		collegeYear: 0,
		nflYear: 0,

		// Persistent team identity (generated when entering each phase)
		townName: '',
		townMascot: '',
		hsName: '',
		hsMascot: '',

		// NFL team identity (set at draft)
		nflTeamId: '',
		nflConference: '',
		nflDivision: '',

		// College status
		isRedshirt: false,
		eligibilityYears: 4,

		useRealTeamNames: true,

		teamPalette: null,

		// Generate a deterministic portrait from the player name
		avatarConfig: randomAvatarConfig(
			`${firstName} ${lastName}`,
			{ archetype: 'player', age: 0 },
		),

		// Initialize milestone tracking
		milestones: {},

		// Initialize childhood event tracking
		seenEventIds: {},
		seenEventFamilies: {},
		eventTagCounts: {},
		flagProgress: {},
	};

	return player;
}

//============================================
// Modify a core stat with clamping
export function modifyStat(player: Player, stat: keyof CoreStats, delta: number): void {
	player.core[stat] = clampStat(player.core[stat] + delta);
}

//============================================
// Get the position bucket for a given position
export function getPositionBucket(position: Position): PositionBucket {
	switch (position) {
		case 'QB':
			return 'passer';
		case 'RB':
		case 'WR':
		case 'TE':
			return 'runner_receiver';
		case 'OL':
		case 'DL':
			return 'lineman';
		case 'LB':
		case 'CB':
		case 'S':
			return 'defender';
		case 'K':
		case 'P':
			return 'kicker';
		default:
			return 'defender';
	}
}

//============================================
// Modify GPA with clamping (0.0-4.0) and rounding
export function modifyGpa(player: Player, delta: number): void {
	const newGpa = player.gpa + delta;
	player.gpa = Math.round(Math.max(0.0, Math.min(4.0, newGpa)) * 100) / 100;
}

//============================================
// Get academic standing label from GPA
export function getAcademicStanding(gpa: number): string {
	if (gpa >= 3.5) {
		return 'Honor Roll';
	}
	if (gpa >= 3.0) {
		return 'Good Standing';
	}
	if (gpa >= 2.0) {
		return 'Eligible';
	}
	if (gpa >= 1.5) {
		return 'Academic Probation';
	}
	return 'Ineligible';
}

//============================================
// Modify relationship score with clamping (0-100)
export function modifyRelationship(
	player: Player,
	name: string,
	delta: number
): void {
	let currentScore = player.relationships[name];
	if (currentScore === undefined) {
		currentScore = 50;
	}
	const newScore = currentScore + delta;
	player.relationships[name] = Math.max(0, Math.min(100, newScore));
}

//============================================
// Get relationship level label from score
export function getRelationshipLevel(score: number): string {
	if (score >= 80) {
		return 'Close';
	}
	if (score >= 60) {
		return 'Friendly';
	}
	if (score >= 40) {
		return 'Neutral';
	}
	if (score >= 20) {
		return 'Strained';
	}
	return 'Hostile';
}

