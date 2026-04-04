// player.ts - player state: stats, age, position, injuries, career history

import { TeamPalette } from './theme.js';

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
// Position buckets for simplified first build
export type PositionBucket = 'passer' | 'runner_receiver' | 'lineman' | 'defender' | 'kicker';

// Specific positions within buckets
export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'S' | 'K' | 'P';

//============================================
// Career phases
export type CareerPhase = 'childhood' | 'youth' | 'high_school' | 'college' | 'nfl' | 'legacy';

//============================================
// Depth chart status
export type DepthChartStatus = 'starter' | 'backup' | 'bench';

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
	seasonStats: SeasonStatTotals,
	statLine: Record<string, number | string>,
): void {
	seasonStats.gamesPlayed += 1;
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
// A single season record entry
export interface SeasonRecord {
	phase: CareerPhase;
	year: number;
	age: number;
	team: string;
	position: Position | null;
	wins: number;
	losses: number;
	depthChart: DepthChartStatus;
	highlights: string[];
	awards: string[];
	statTotals?: SeasonStatTotals;
}

//============================================
// Persistent story flags for multi-step event chains
export interface StoryFlags {
	[key: string]: boolean;
}

//============================================
// The full player state
export interface Player {
	// Identity
	firstName: string;
	lastName: string;
	age: number;

	// Current phase and position
	phase: CareerPhase;
	position: Position | null;
	positionBucket: PositionBucket | null;
	depthChart: DepthChartStatus;

	// Stats
	core: CoreStats;
	career: CareerStats;
	hidden: HiddenStats;
	seasonStats: SeasonStatTotals;

	// Season tracking
	currentSeason: number;   // which season in career (1-based)
	currentWeek: number;     // which week in current season (0 = offseason)
	seasonYear: number;      // calendar year

	// Team
	teamName: string;
	teamStrength: number;    // 1-100

	// Academic and social
	gpa: number;             // 0.0-4.0 scale
	relationships: Record<string, number>; // name -> 0-100 score

	// Story and progression
	storyFlags: StoryFlags;
	storyLog: string[];      // recent story entries
	careerHistory: SeasonRecord[];
	bigDecisions: string[];  // log of major choices made

	// Recruiting (HS/college)
	recruitingStars: number; // 0-5
	collegeOffers: string[];
	draftStock: number;      // 0-100

	// Career year tracking (persisted for save/load)
	collegeYear: number;     // 0 = not started, 1-4 = freshman-senior
	nflYear: number;         // 0 = not started, 1+ = NFL seasons played

	// Settings
	useRealTeamNames: boolean;

	// Theme
	teamPalette: TeamPalette | null;
}

//============================================
// Random integer in range [min, max] inclusive
export function randomInRange(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
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
		relationships: {
			'Mom': randomInRange(60, 90),
			'Dad': randomInRange(50, 85),
			'Coach': 50,
		},

		recruitingStars: 0,
		collegeOffers: [],
		draftStock: 0,

		collegeYear: 0,
		nflYear: 0,

		useRealTeamNames: true,

		teamPalette: null,
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

//============================================
// Simple assertions for testing
const testStats = generateBirthStats();
console.assert(testStats.core.athleticism >= 20 && testStats.core.athleticism <= 80,
	'Athleticism should be 20-80 at birth');
console.assert(testStats.core.technique >= 0 && testStats.core.technique <= 10,
	'Technique should be 0-10 at birth');
console.assert(testStats.hidden.size >= 1 && testStats.hidden.size <= 5,
	'Size should be 1-5');
console.assert(clampStat(150) === 100, 'clampStat should cap at 100');
console.assert(clampStat(-10) === 0, 'clampStat should floor at 0');
console.assert(getPositionBucket('QB') === 'passer', 'QB should be passer bucket');
console.assert(getPositionBucket('WR') === 'runner_receiver', 'WR should be runner_receiver');
console.assert(getPositionBucket('LB') === 'defender', 'LB should be defender');

// Test GPA and academic standing
const testPlayer = createPlayer('John', 'Doe');
console.assert(testPlayer.gpa === 2.5, 'New player should start with 2.5 GPA');
console.assert(getAcademicStanding(3.7) === 'Honor Roll', 'GPA 3.7 should be Honor Roll');
console.assert(getAcademicStanding(3.2) === 'Good Standing', 'GPA 3.2 should be Good Standing');
console.assert(getAcademicStanding(2.5) === 'Eligible', 'GPA 2.5 should be Eligible');
console.assert(getAcademicStanding(1.8) === 'Academic Probation', 'GPA 1.8 should be Academic Probation');
console.assert(getAcademicStanding(1.0) === 'Ineligible', 'GPA 1.0 should be Ineligible');

// Test GPA modification with clamping and rounding
modifyGpa(testPlayer, 0.5);
console.assert(testPlayer.gpa === 3.0, 'GPA should be 3.0 after +0.5 delta');
modifyGpa(testPlayer, 5.0);
console.assert(testPlayer.gpa === 4.0, 'GPA should clamp at 4.0');
modifyGpa(testPlayer, -10.0);
console.assert(testPlayer.gpa === 0.0, 'GPA should clamp at 0.0');

// Test relationships
console.assert(testPlayer.relationships['Mom'] >= 60 && testPlayer.relationships['Mom'] <= 90,
	'Mom relationship should be 60-90 at start');
console.assert(testPlayer.relationships['Coach'] === 50, 'Coach relationship should be 50 at start');
console.assert(getRelationshipLevel(85) === 'Close', 'Score 85 should be Close');
console.assert(getRelationshipLevel(70) === 'Friendly', 'Score 70 should be Friendly');
console.assert(getRelationshipLevel(50) === 'Neutral', 'Score 50 should be Neutral');
console.assert(getRelationshipLevel(30) === 'Strained', 'Score 30 should be Strained');
console.assert(getRelationshipLevel(10) === 'Hostile', 'Score 10 should be Hostile');

// Test relationship modification
modifyRelationship(testPlayer, 'Coach', 20);
console.assert(testPlayer.relationships['Coach'] === 70, 'Coach relationship should be 70 after +20 delta');
modifyRelationship(testPlayer, 'Coach', 50);
console.assert(testPlayer.relationships['Coach'] === 100, 'Coach relationship should clamp at 100');
modifyRelationship(testPlayer, 'Rival', 0);
console.assert(testPlayer.relationships['Rival'] === 50, 'New relationship should start at 50');
modifyRelationship(testPlayer, 'NewPerson', -50);
console.assert(testPlayer.relationships['NewPerson'] === 0, 'New relationship with -50 delta should clamp at 0');
