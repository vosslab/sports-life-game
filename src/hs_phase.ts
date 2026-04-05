// hs_phase.ts - high school football phase with weekly loop

import {
	Player, CoreStats, CareerPhase, Position,
	createPlayer, randomInRange, clampStat, getPositionBucket,
	accumulateGameStats, createEmptySeasonStats,
} from './player.js';
import {
	Team, ScheduleEntry, generateHighSchoolTeam, generateOpponentName,
	Conference, generateConference, simulateConferenceWeek, formatStandings,
} from './team.js';
import {
	WeeklyFocus, GameResult,
	applySeasonGoal, applyWeeklyFocus, simulateGame, evaluateDepthChartUpdate, runPracticeSession,
} from './week_sim.js';
import { updateRecruitingStars, generateOffers } from './recruiting.js';
import {
	GameEvent, loadEvents, filterEvents,
	selectEvent, applyEventChoice,
} from './events.js';
import * as ui from './ui.js';
import {
	generateTeamPalette,
	applyPalette,
} from './theme.js';
import {
	updateTabBar, switchTab, hideTabBar, showTabBar,
} from './tabs.js';
import {
	Activity, WeekState, createWeekState, canDoActivity,
	getActivitiesForPhase, isActivityUnlocked, applyActivity, getEffectPreview,
} from './activities.js';
import type { GameContext } from './game_loop.js';
import {
	showWeeklyFocusUI, handleWeeklyFocus, applyGoalAndProceed, proceedToEventCheck,
	resetWeekState, getWeekState, initGameLoop,
	simulateWeekSilently, showYearRecap,
} from './game_loop.js';
import type { YearSimRecap } from './game_loop.js';

//============================================
// Season stats tracking for awards and highlights
interface SeasonStats {
	totalYards: number;
	totalTouchdowns: number;
	totalTackles: number;
	totalInterceptions: number;
	gamesPlayed: number;
	playerOfTheWeekCount: number;
}

//============================================
// HS Phase module state
let ctx: GameContext | null = null;
let persistentHSTeam: Team | null = null;
let hsConference: Conference | null = null;
let wonStateThisSeason = false;
let currentSeasonStats: SeasonStats = {
	totalYards: 0,
	totalTouchdowns: 0,
	totalTackles: 0,
	totalInterceptions: 0,
	gamesPlayed: 0,
	playerOfTheWeekCount: 0,
};
let allEvents: GameEvent[] = [];
let onBeginCollege: (() => void) | null = null;
let backupShowcaseUsed = false;
let isSeasonStartInProgress = false;

export const HS_SEASON_WEEKS = 10;

//============================================
// Getters used by main.ts for tab and header summaries
export function getHSTeam(): Team | null {
	return persistentHSTeam;
}

export function getHSConference(): Conference | null {
	return hsConference;
}

//============================================
// Initialize HS phase with context and callback
export async function initHighSchoolPhase(
	context: GameContext,
	beginCollegeCallback: () => void,
): Promise<void> {
	ctx = context;
	onBeginCollege = beginCollegeCallback;
	initGameLoop(context);
	// Preload events so startHighSchoolSeason can be synchronous
	if (allEvents.length === 0) {
		allEvents = await loadEvents();
	}
}

//============================================
// Helper: generate school name
function generateSchoolName(): string {
	// Silly minor-league-style high school names
	const prefixes = [
		'Westfield', 'North Valley', 'Lincoln', 'Riverside',
		'Cedar Creek', 'Oakmont', 'Fairview', 'Heritage',
		'Summit', 'Crestwood', 'Lakewood', 'Eastside',
		'Mountainview', 'Bayshore', 'Pinecrest', 'Highland',
		'Pine Bluff', 'Lakeview', 'Milltown', 'Copper Hills',
		'Dry Creek', 'Maple Fork', 'River City', 'Willow Springs',
		'Elkhorn', 'Blue Ridge', 'Fox Hollow', 'Stonebridge',
	];
	const mascots = [
		// Animals
		'Alpacas', 'Bumblebees', 'Cobras', 'Ferrets', 'Foxes',
		'Frogs', 'Gophers', 'Jackrabbits', 'Lemurs', 'Narwhals',
		'Puffins', 'Raccoons', 'Seals', 'Squids', 'Turtles',
		'Wombats', 'Lobsters', 'Platypus', 'Tadpoles', 'Zebras',
		// Food
		'Avocados', 'Beets', 'Hot Peppers', 'Kumquats', 'Spuds',
		// Plants
		'Dandelions', 'Clovers', 'Marigolds', 'Ferns',
		// Rare weird
		'Wyverns',
	];
	const prefix = prefixes[randomInRange(0, prefixes.length - 1)];
	const mascot = mascots[randomInRange(0, mascots.length - 1)];
	return `${prefix} ${mascot}`;
}

//============================================
// Helper: get coach title for narrative
function getCoachTitle(team: Team): string {
	switch (team.coachPersonality) {
		case 'supportive': return 'Williams (known for developing young talent)';
		case 'demanding': return 'Jackson (expects perfection every week)';
		case 'volatile': return 'Martinez (a wildcard who keeps everyone guessing)';
	}
}

//============================================
// Main entry point: start high school season
export function startHighSchoolSeason(): void {
	if (!ctx) {
		return;
	}
	if (isSeasonStartInProgress) {
		return;
	}
	isSeasonStartInProgress = true;
	try {
		const player = ctx.getPlayer();

		// BUG FIX 1: Reuse same high school team across 4 years
		if (persistentHSTeam === null) {
			// First season: generate a new team and store it
			const schoolName = generateSchoolName();
			persistentHSTeam = generateHighSchoolTeam(schoolName);
			player.teamName = schoolName;
			// Apply team colors
			const hsPalette = generateTeamPalette();
			applyPalette(hsPalette);
			player.teamPalette = hsPalette;
		} else {
			// Subsequent seasons: reuse the team but reset wins/losses
			persistentHSTeam.wins = 0;
			persistentHSTeam.losses = 0;
			const newSchedule: ScheduleEntry[] = [];
			const scheduleLength = persistentHSTeam.schedule.length;
			for (let week = 1; week <= scheduleLength; week++) {
				const opponentStrength = randomInRange(35, 95);
				const opponent: ScheduleEntry = {
					opponentName: generateOpponentName(),
					opponentStrength,
					week,
					played: false,
					teamScore: 0,
					opponentScore: 0,
				};
				newSchedule.push(opponent);
			}
			persistentHSTeam.schedule = newSchedule;
			persistentHSTeam.strength = clampStat(
				persistentHSTeam.strength + randomInRange(1, 4)
			);
		}

		player.currentSeason += 1;
		player.currentWeek = 0;

		// Events are preloaded in initHighSchoolPhase

		currentSeasonStats = {
			totalYards: 0,
			totalTouchdowns: 0,
			totalTackles: 0,
			totalInterceptions: 0,
			gamesPlayed: 0,
			playerOfTheWeekCount: 0,
		};
		player.seasonStats = createEmptySeasonStats();
		wonStateThisSeason = false;
		backupShowcaseUsed = false;

		ctx.save();
		ui.updateHeader(player);
		ui.updateAllStats(player);

		ctx.clearStory();
		ctx.addHeadline(
			`Season ${player.currentSeason}: ${player.teamName}`
		);
		ctx.addText(
			`The ${player.teamName} are ready for a new season. `
			+ `Coach ${getCoachTitle(persistentHSTeam)} has the roster set.`
		);

		const status = player.depthChart === 'starter'
			? 'You are the starting ' + player.position + '.'
			: 'You are listed as ' + player.depthChart
				+ ' at ' + player.position + '.';
		ctx.addText(status);

		// Update life status bar with record and recruiting info
		const recruitExtra = player.recruitingStars > 0
			? `Recruiting: ${player.recruitingStars} stars`
			: '';
		ui.updateLifeStatus(
			`Record: ${persistentHSTeam.wins}-${persistentHSTeam.losses}`,
			`Week 1 of ${HS_SEASON_WEEKS}`,
			recruitExtra
		);

		ui.showChoices([
			{ text: 'Begin Preseason', primary: true, action: startPreseason },
		]);
	} finally {
		isSeasonStartInProgress = false;
	}
}

//============================================
export function resumeHighSchoolSeason(): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	if (persistentHSTeam === null || player.currentSeason === 0) {
		void startHighSchoolSeason();
		return;
	}

	if (player.currentWeek <= 0 && player.seasonStats.gamesPlayed === 0) {
		startPreseason();
		return;
	}

	if (player.currentWeek >= HS_SEASON_WEEKS) {
		endSeason();
		return;
	}

	startWeek();
}

//============================================
function startPreseason(): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	// Week -1: Tryouts
	player.currentWeek = -1;
	ctx.save();

	ctx.clearStory();
	ctx.addHeadline('Preseason: Tryouts');
	ctx.addText('Preseason week. The coaching staff is evaluating the roster.');

	if (player.depthChart === 'backup') {
		ctx.addText(
			'You are a backup looking to earn your shot as a starter. '
			+ 'Everyone is watching. What is your strategy?'
		);
		ui.waitForInteraction('Tryout Strategy', [
			{
				text: 'Outwork everyone at practice',
				primary: false,
				action: () => handleTryoutChoice(
					'outwork',
					{ technique: 3, discipline: 2 }
				),
			},
			{
				text: 'Show off your athleticism',
				primary: false,
				action: () => handleTryoutChoice(
					'athleticism',
					{ athleticism: 2, confidence: 2 }
				),
			},
			{
				text: 'Study the playbook',
				primary: false,
				action: () => handleTryoutChoice(
					'playbook',
					{ footballIq: 3 }
				),
			},
		]);
	} else {
		ctx.addText(
			'You are the starter. Now it is about staying sharp and '
			+ 'staying healthy.'
		);
		ui.waitForInteraction('Preseason Preparation', [
			{
				text: 'Move to Week 0',
				primary: true,
				action: preseasonFirstScrimmage,
			},
		]);
	}
}

//============================================
function handleTryoutChoice(strategy: string, effects: Record<string, number>): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	// Apply stat changes
	for (const [stat, delta] of Object.entries(effects)) {
		const key = stat as keyof CoreStats;
		if (key in player.core) {
			player.core[key] = clampStat(player.core[key] + delta);
		}
	}
	ui.updateAllStats(player);
	ctx.save();

	// Flavor text for each choice
	let flavor = '';
	switch (strategy) {
		case 'outwork':
			flavor = 'You stay late, run extra drills, and push yourself harder '
				+ 'than anyone else. The coaches are taking notice.';
			break;
		case 'athleticism':
			flavor = 'You line up and show what you can do athletically. '
				+ 'The coaching staff exchanged impressed looks.';
			break;
		case 'playbook':
			flavor = 'You study film and memorize the scheme. During practice, '
				+ 'you are always in the right spot, making smart reads.';
			break;
	}
	ctx.addText(flavor);

	// Roll to see if they earn starter role (30% base chance)
	const earnChance = Math.max(
		30,
		Math.min(
			80,
			30
			+ (player.core.technique - 50) / 2
			+ (player.core.confidence - 50) / 2
		)
	);

	const roll = randomInRange(1, 100);
	if (roll <= earnChance) {
		player.depthChart = 'starter';
		ctx.addText(
			'Coach pulled you aside: "You earned it. You are starting '
			+ 'next Friday."'
		);
	} else {
		ctx.addText(
			'Coach nods respectfully, but does not commit. You are still '
			+ 'in the conversation.'
		);
	}

	ctx.save();
	ui.updateAllStats(player);

	ui.showChoices([
		{
			text: 'Move to Week 0',
			primary: true,
			action: preseasonFirstScrimmage,
		},
	]);
}

//============================================
function preseasonFirstScrimmage(): void {
	if (!ctx || !persistentHSTeam) {
		return;
	}
	const player = ctx.getPlayer();

	player.currentWeek = 0;
	ctx.save();

	ctx.clearStory();
	ctx.addHeadline('Preseason: First Scrimmage');
	ctx.addText('Week 0. A full-speed practice game against the second team.');

	// Quick scrimmage sim with a weaker opponent
	const result = simulateGame(player, persistentHSTeam, 35);

	ctx.addText(result.storyText);
	const formattedStats = ui.formatStatLine(result.playerStatLine);
	if (formattedStats.length > 0) {
		ctx.addResult(formattedStats);
	}

	// Slight confidence boost for scrimmage
	player.core.confidence = clampStat(
		player.core.confidence + randomInRange(1, 2)
	);
	ctx.save();
	ui.updateAllStats(player);

	// Configure main action bar for the HS season
	ui.configureMainButtons({
		nextLabel: 'Next Week',
		nextAction: startWeek,
		ageUpVisible: true,
		ageUpAction: simulateHSSeason,
	});
	ui.showMainActionBar();

	ui.showChoices([
		{
			text: 'Begin Regular Season',
			primary: true,
			action: startWeek,
		},
	]);
}

//============================================
// Simulate remaining HS season weeks silently (Age Up)
function simulateHSSeason(): void {
	if (!ctx || !persistentHSTeam) {
		return;
	}
	const player = ctx.getPlayer();

	const recap: YearSimRecap = {
		weeksSimulated: 0,
		wins: 0,
		losses: 0,
		events: [],
	};

	// Track wins/losses at start to compute delta
	const startWins = persistentHSTeam.wins;
	const startLosses = persistentHSTeam.losses;

	// Simulate remaining weeks
	while (player.currentWeek < HS_SEASON_WEEKS) {
		// Advance week counter
		if (player.currentWeek === 0) {
			player.currentWeek = 1;
		} else {
			player.currentWeek += 1;
		}
		recap.weeksSimulated += 1;

		// Silent focus + event resolution
		const weekResult = simulateWeekSilently();
		if (weekResult.eventTitle) {
			recap.events.push(weekResult.eventTitle);
		}

		// Simulate game day
		const scheduleIdx = player.currentWeek - 1;
		if (scheduleIdx < persistentHSTeam.schedule.length) {
			const opponent = persistentHSTeam.schedule[scheduleIdx];
			const result = simulateGame(
				player,
				persistentHSTeam,
				opponent.opponentStrength,
			);

			// Record result
			opponent.played = true;
			opponent.teamScore = result.teamScore;
			opponent.opponentScore = result.opponentScore;

			if (result.result === 'win') {
				persistentHSTeam.wins += 1;
			} else if (result.result === 'loss') {
				persistentHSTeam.losses += 1;
			}

			// Confidence adjustment
			if (result.result === 'win') {
				player.core.confidence = clampStat(
					player.core.confidence + randomInRange(1, 3)
				);
			} else {
				player.core.confidence = clampStat(
					player.core.confidence + randomInRange(-3, 0)
				);
			}

			// Accumulate stats
			accumulateGameStats(player, result.playerStatLine);
			currentSeasonStats.gamesPlayed += 1;
		}
	}

	// Compute recap totals
	recap.wins = persistentHSTeam.wins - startWins;
	recap.losses = persistentHSTeam.losses - startLosses;

	ctx.save();
	ui.updateAllStats(player);
	// Update life status bar with record and recruiting info
	const recruitExtra = player.recruitingStars > 0
		? `Recruiting: ${player.recruitingStars} stars`
		: '';
	ui.updateLifeStatus(
		`Record: ${persistentHSTeam.wins}-${persistentHSTeam.losses}`,
		'End of Season',
		recruitExtra
	);

	// Show recap popup, then proceed to season end
	showYearRecap(recap, endSeason);
}

//============================================
function startWeek(): void {
	if (!ctx || !persistentHSTeam) {
		return;
	}
	const player = ctx.getPlayer();

	// Reset weekly state for new week
	resetWeekState();

	// Advance week (start from week 1)
	if (player.currentWeek === 0) {
		player.currentWeek = 1;
	} else {
		player.currentWeek += 1;
	}
	ctx.save();

	ctx.clearStory();
	ctx.addHeadline(
		`Week ${player.currentWeek} of ${HS_SEASON_WEEKS}`
	);

	// Show the opponent for this week
	const scheduleIdx = player.currentWeek - 1;
	if (scheduleIdx < persistentHSTeam.schedule.length) {
		const opp = persistentHSTeam.schedule[scheduleIdx];
		ctx.addText(
			`This week: vs ${opp.opponentName}`
		);
	}

	// Apply season goal and proceed (no weekly focus popup)
	applyGoalAndProceed(
		'high_school',
		proceedToGameDay,
		() => {
			if (player.depthChart !== 'starter') {
				const practiceResult = runPracticeSession(player);
				ctx!.addText(`Practice grade: ${practiceResult.grade}`);
				ctx!.addText(practiceResult.storyText);
				if (practiceResult.depthUpdate.changed) {
					ctx!.addText(practiceResult.depthUpdate.message);
					ui.updateHeader(player);
				}
				ctx!.save();
			}
		},
	);
}

//============================================
function proceedToGameDay(): void {
	if (!ctx || !persistentHSTeam) {
		return;
	}
	const player = ctx.getPlayer();

	const scheduleIdx = player.currentWeek - 1;
	if (scheduleIdx >= persistentHSTeam.schedule.length) {
		// Past end of schedule, go to season end
		endSeason();
		return;
	}

	const opponent = persistentHSTeam.schedule[scheduleIdx];
	const giveBackupShowcase = player.depthChart === 'backup'
		&& !backupShowcaseUsed
		&& player.currentWeek >= 6;
	const originalDepthChart = player.depthChart;

	if (giveBackupShowcase) {
		backupShowcaseUsed = true;
		player.depthChart = 'starter';
		ctx.addText(
			'Coach gives you a real shot this week. You are getting first-team reps and a showcase start.'
		);
	}

	// Simulate the game
	const result = simulateGame(
		player,
		persistentHSTeam,
		opponent.opponentStrength,
	);

	if (giveBackupShowcase && originalDepthChart === 'backup') {
		player.depthChart = 'backup';
	}

	// Record the result in schedule
	opponent.played = true;
	opponent.teamScore = result.teamScore;
	opponent.opponentScore = result.opponentScore;

	// Update team record
	if (result.result === 'win') {
		persistentHSTeam.wins += 1;
	} else if (result.result === 'loss') {
		persistentHSTeam.losses += 1;
	}

	// Confidence adjusts based on result
	if (result.result === 'win') {
		player.core.confidence = clampStat(
			player.core.confidence + randomInRange(1, 3)
		);
	} else {
		player.core.confidence = clampStat(
			player.core.confidence + randomInRange(-3, 0)
		);
	}

	// Track season stats for awards and player accumulation
	accumulateGameStats(player, result.playerStatLine);
	currentSeasonStats.gamesPlayed += 1;
	const stats = result.playerStatLine;

	// totalYards = passYards + rushYards + recYards
	const passYards = typeof stats['passYards'] === 'number' ? stats['passYards'] : 0;
	const rushYards = typeof stats['rushYards'] === 'number' ? stats['rushYards'] : 0;
	const recYards = typeof stats['recYards'] === 'number' ? stats['recYards'] : 0;
	currentSeasonStats.totalYards += passYards + rushYards + recYards;

	// totalTouchdowns = passTds + rushTds + recTds
	const passTds = typeof stats['passTds'] === 'number' ? stats['passTds'] : 0;
	const rushTds = typeof stats['rushTds'] === 'number' ? stats['rushTds'] : 0;
	const recTds = typeof stats['recTds'] === 'number' ? stats['recTds'] : 0;
	currentSeasonStats.totalTouchdowns += passTds + rushTds + recTds;

	// totalTackles = tackles
	const tackles = typeof stats['tackles'] === 'number' ? stats['tackles'] : 0;
	currentSeasonStats.totalTackles += tackles;

	// totalInterceptions = passInts (for QBs) or ints (for defenders)
	const passInts = typeof stats['passInts'] === 'number' ? stats['passInts'] : 0;
	const defInts = typeof stats['ints'] === 'number' ? stats['ints'] : 0;
	currentSeasonStats.totalInterceptions += passInts + defInts;

	// Player of the Week: probabilistic per The Show spec
	// Elite: 15-25%, Great: 5-12%, Good: 1-3%, otherwise 0%
	let potwChance = 0;
	if (result.playerRating === 'elite') {
		potwChance = randomInRange(15, 25);
	} else if (result.playerRating === 'great') {
		potwChance = randomInRange(5, 12);
	} else if (result.playerRating === 'good') {
		potwChance = randomInRange(1, 3);
	}
	const potwRoll = randomInRange(1, 100);
	if (potwRoll <= potwChance) {
		currentSeasonStats.playerOfTheWeekCount += 1;
	}

	ctx.save();
	ui.updateAllStats(player);

	// Display game result
	ctx.clearStory();
	ctx.addHeadline('Game Day');
	if (giveBackupShowcase) {
		ctx.addText('This was your guaranteed chance to prove you deserve more than backup reps.');
	}
	ctx.addText(result.storyText);
	ctx.addResult(`Grade: ${result.playerGrade}`);

	// Format stat line with human-readable labels
	const formattedStats = ui.formatStatLine(result.playerStatLine);
	if (formattedStats.length > 0) {
		ctx.addResult(formattedStats);
	}

	const scoreStr = `${persistentHSTeam.teamName} ${result.teamScore} - `
		+ `${opponent.opponentName} ${result.opponentScore}`;
	ctx.addResult(scoreStr);

	const depthUpdate = evaluateDepthChartUpdate(player, result.playerGrade);
	if (depthUpdate.changed) {
		ctx.addText(depthUpdate.message);
		ctx.save();
		ui.updateHeader(player);
	} else if (giveBackupShowcase && player.depthChart === 'backup') {
		ctx.addText('You got your shot this week, but the coaches are keeping you at backup for now.');
	}

	// Show player of the week if awarded this week
	if (potwRoll <= potwChance) {
		ctx.addResult('*** PLAYER OF THE WEEK ***');
	}

	// Update life status bar with record, next week, and recruiting info
	const recordStr = `Record: ${persistentHSTeam.wins}-${persistentHSTeam.losses}`;
	const nextWeek = player.currentWeek < HS_SEASON_WEEKS
		? `Week ${player.currentWeek + 1}`
		: 'End of Season';
	const recruitInfo = player.recruitingStars > 0
		? `Recruiting: ${player.recruitingStars} stars`
		: '';
	ui.updateLifeStatus(recordStr, nextWeek, recruitInfo);

	// Check if season is over
	if (player.currentWeek >= HS_SEASON_WEEKS) {
		ui.showChoices([
			{ text: 'Season Summary', primary: true, action: endSeason },
		]);
	} else {
		ui.showChoices([
			{ text: 'Next Week', primary: true, action: startWeek },
		]);
	}
}

//============================================
function endSeason(): void {
	if (!ctx || !persistentHSTeam) {
		return;
	}

	// Hide main action bar during offseason/transition
	ui.hideMainActionBar();

	// Check for playoffs
	if (persistentHSTeam.wins >= 6) {
		// Team qualifies for playoffs
		ui.showChoices([
			{
				text: 'Playoff Time!',
				primary: true,
				action: startPlayoffs,
			},
		]);
		return;
	}

	// No playoffs: go to season summary
	completeSeasonSummary();
}

//============================================
function startPlayoffs(): void {
	if (!ctx || !persistentHSTeam) {
		return;
	}

	ctx.clearStory();
	ctx.addHeadline('Playoff Time!');
	ctx.addText(
		`The ${persistentHSTeam.teamName} qualified for the playoffs with a `
		+ `${persistentHSTeam.wins}-${persistentHSTeam.losses} record!`
	);
	ctx.addText('Your playoff run begins. One team stands in the way of states.');

	ctx.save();

	// Start first playoff game
	playPlayoffGame(1);
}

//============================================
function playPlayoffGame(playoffRound: number): void {
	if (!ctx || !persistentHSTeam) {
		return;
	}
	const player = ctx.getPlayer();

	// 3 rounds max: regional -> state -> championship
	if (playoffRound > 3) {
		// BUG FIX 3: Only show championship message once per season
		if (!wonStateThisSeason) {
			wonStateThisSeason = true;
			// Won state championship!
			ctx.clearStory();
			ctx.addHeadline('STATE CHAMPIONS!');
			ctx.addText(
				`The ${persistentHSTeam.teamName} are State Champions! `
				+ 'You did it. You took your team all the way.'
			);
			ctx.addText(
				'This is the biggest moment of your high school career. '
				+ 'The scouts will remember.'
			);
			if (player.recruitingStars < 5) {
				player.recruitingStars = 5;
			}
			// Track championship in big decisions
			player.bigDecisions.push(
				`Won State Championship in Season ${player.currentSeason}`
			);
		}

		ctx.save();
		ui.updateAllStats(player);

		ui.showChoices([
			{
				text: 'End Season',
				primary: true,
				action: completeSeasonSummary,
			},
		]);
		return;
	}

	// BUG FIX 3: Generate opponent with significantly higher strength for playoffs
	// Make state championships rare (~8% for average team)
	let opponentStrength: number;
	if (playoffRound === 1) {
		// Regional: moderate difficulty
		opponentStrength = randomInRange(65, 80);
	} else if (playoffRound === 2) {
		// State Semifinal: much harder
		opponentStrength = randomInRange(78, 92);
	} else {
		// State Final: extremely difficult
		opponentStrength = randomInRange(88, 98);
	}
	const roundNames = ['Regional Playoff', 'State Semifinal', 'State Final'];
	const roundName = roundNames[playoffRound - 1];

	ctx.clearStory();
	ctx.addHeadline(roundName);
	ctx.addText(
		'One game. Winner advances to the next round. '
		+ 'Everything you worked for comes down to this.'
	);

	// Weekly focus before playoff game
	ctx.addText('What do you focus on this week?');
	ui.waitForInteraction('Playoff Preparation', [
		{
			text: 'Train',
			primary: false,
			action: () => preparePlayoffGame(playoffRound, 'train', opponentStrength),
		},
		{
			text: 'Film Study',
			primary: false,
			action: () => preparePlayoffGame(playoffRound, 'film_study', opponentStrength),
		},
		{
			text: 'Recovery',
			primary: false,
			action: () => preparePlayoffGame(playoffRound, 'recovery', opponentStrength),
		},
	]);
}

//============================================
function preparePlayoffGame(
	playoffRound: number,
	focus: WeeklyFocus,
	opponentStrength: number
): void {
	if (!ctx || !persistentHSTeam) {
		return;
	}
	const player = ctx.getPlayer();

	// Apply season goal effects
	const focusStory = applySeasonGoal(player);
	ctx.addText(focusStory);
	ui.updateAllStats(player);
	ctx.save();

	// Simulate playoff game
	const result = simulateGame(player, persistentHSTeam, opponentStrength);

	// Track playoff stats on player and local season counters
	accumulateGameStats(player, result.playerStatLine);
	currentSeasonStats.gamesPlayed += 1;
	const pStats = result.playerStatLine;
	const pPassYards = typeof pStats['passYards'] === 'number' ? pStats['passYards'] : 0;
	const pRushYards = typeof pStats['rushYards'] === 'number' ? pStats['rushYards'] : 0;
	const pRecYards = typeof pStats['recYards'] === 'number' ? pStats['recYards'] : 0;
	currentSeasonStats.totalYards += pPassYards + pRushYards + pRecYards;
	const pPassTds = typeof pStats['passTds'] === 'number' ? pStats['passTds'] : 0;
	const pRushTds = typeof pStats['rushTds'] === 'number' ? pStats['rushTds'] : 0;
	const pRecTds = typeof pStats['recTds'] === 'number' ? pStats['recTds'] : 0;
	currentSeasonStats.totalTouchdowns += pPassTds + pRushTds + pRecTds;
	const pTackles = typeof pStats['tackles'] === 'number' ? pStats['tackles'] : 0;
	currentSeasonStats.totalTackles += pTackles;
	if (result.playerRating === 'elite') {
		currentSeasonStats.playerOfTheWeekCount += 1;
	}

	ctx.save();
	ui.updateAllStats(player);

	ctx.clearStory();
	const roundNames = ['Regional Playoff', 'State Semifinal', 'State Final'];
	ctx.addHeadline(roundNames[playoffRound - 1]);
	ctx.addText(result.storyText);
	ctx.addResult(`Grade: ${result.playerGrade}`);

	// Format stat line with human-readable labels
	const formattedStats = ui.formatStatLine(result.playerStatLine);
	if (formattedStats.length > 0) {
		ctx.addResult(formattedStats);
	}

	const playoffDepthUpdate = evaluateDepthChartUpdate(player, result.playerGrade);
	if (playoffDepthUpdate.changed) {
		ctx.addText(playoffDepthUpdate.message);
		ctx.save();
		ui.updateHeader(player);
	}

	if (result.result === 'win') {
		persistentHSTeam.wins += 1;
		ctx.addResult('PLAYOFF WIN!');
		player.core.confidence = clampStat(
			player.core.confidence + randomInRange(2, 4)
		);

		ui.showChoices([
			{
				text: 'Advance',
				primary: true,
				action: () => playPlayoffGame(playoffRound + 1),
			},
		]);
	} else {
		persistentHSTeam.losses += 1;
		ctx.addResult('Playoff Loss. Season Over.');
		player.core.confidence = clampStat(
			player.core.confidence + randomInRange(-3, 0)
		);

		ui.showChoices([
			{
				text: 'End Season',
				primary: true,
				action: completeSeasonSummary,
			},
		]);
	}

	ctx.save();
}

//============================================
function completeSeasonSummary(): void {
	if (!ctx || !persistentHSTeam) {
		return;
	}
	const player = ctx.getPlayer();

	ctx.clearStory();
	ctx.addHeadline('Season Over');
	ctx.addText(
		`Final record: ${persistentHSTeam.wins}-${persistentHSTeam.losses}`
	);

	// Season narrative based on record
	// Guard against division by zero if no games played
	const totalGames = persistentHSTeam.wins + persistentHSTeam.losses;
	const winPct = totalGames > 0 ? persistentHSTeam.wins / totalGames : 0;
	let seasonStory: string;
	if (winPct >= 0.8) {
		seasonStory = 'An incredible season. The scouts are paying attention.';
	} else if (winPct >= 0.6) {
		seasonStory = 'A solid season. You proved you belong on this team.';
	} else if (winPct >= 0.4) {
		seasonStory = 'A mixed season with some bright spots and tough losses.';
	} else {
		seasonStory = 'A tough season, but you learned more from the '
			+ 'losses than you ever would from easy wins.';
	}
	ctx.addText(seasonStory);

	// Depth chart promotion check
	if (player.depthChart === 'backup') {
		// Check if performance warrants promotion
		if (player.core.technique >= 35
			&& player.core.confidence >= 40) {
			player.depthChart = 'starter';
			ctx.addText(
				'Coach pulled you aside after the last game. '
				+ '"You earned it. You are starting next season."'
			);
		} else {
			ctx.addText(
				'You are still on the depth chart as a backup. '
				+ 'Keep working.'
			);
		}
	} else if (player.depthChart === 'starter') {
		ctx.addText('You held your starting spot all season. Respect.');
	}

	// Calculate and award honors
	const seasonAwards: string[] = [];

	// All-Conference: avg stat >= 60
	const avgStats = Math.round(
		(player.core.technique + player.core.athleticism) / 2
	);
	if (avgStats >= 60) {
		seasonAwards.push('All-Conference');
		ctx.addText(
			'The coaches voted you to the All-Conference team. '
			+ 'Your name is in the papers.'
		);
	}

	// All-State: avg stat >= 75
	if (avgStats >= 75) {
		seasonAwards.push('All-State');
		ctx.addText(
			'You made All-State. This is the highest honor in high school football. '
			+ 'Your family is so proud.'
		);
	}

	// Record season in career history (one entry per season, append-only)
	player.careerHistory.push({
		phase: 'high_school',
		year: player.seasonYear,
		age: player.age,
		team: persistentHSTeam.teamName,
		position: player.position,
		wins: persistentHSTeam.wins,
		losses: persistentHSTeam.losses,
		ties: 0,
		depthChart: player.depthChart,
		highlights: [
			`Player of the Week: ${currentSeasonStats.playerOfTheWeekCount} times`,
		],
		awards: seasonAwards,
	});

	// Recruiting stars for juniors/seniors
	if (player.age >= 16) {
		const previousStars = player.recruitingStars;
		player.recruitingStars = updateRecruitingStars(player);

		if (player.recruitingStars > previousStars) {
			ctx.addText(
				`Recruiting update: Your stock rose to ${player.recruitingStars} stars.`
			);
		} else if (player.recruitingStars < previousStars) {
			ctx.addText(
				`Recruiting update: Your stock slipped to ${player.recruitingStars} stars.`
			);
		} else {
			ctx.addText(
				`Recruiting update: You remain a ${player.recruitingStars}-star recruit.`
			);
		}

		const offers = generateOffers(
			player,
			player.recruitingStars,
			persistentHSTeam.wins
		);
		player.collegeOffers = offers.map((offer) => (
			`${offer.collegeName} (${offer.division}, ${offer.scholarshipType})`
		));

		if (player.collegeOffers.length > 0) {
			ctx.addText(
				`College offers: ${player.collegeOffers.length}. `
				+ `Top offer: ${player.collegeOffers[0]}.`
			);
		} else {
			ctx.addText('College offers: none yet. Keep building your tape.');
		}
	}

	// Age up and prepare for next season
	player.age += 1;
	player.seasonYear += 1;
	player.currentWeek = 0;
	ctx.save();
	ui.updateHeader(player);

	// Check if high school is over (age 18 = graduated)
	if (player.age >= 18) {
		ui.showChoices([
			{
				text: 'Graduate and move on',
				primary: true,
				action: graduateHighSchool,
			},
		]);
	} else {
		ui.showChoices([
			{
				text: 'Start next season',
				primary: true,
				action: startHighSchoolSeason,
			},
		]);
	}
}

//============================================
function graduateHighSchool(): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	player.phase = 'college';
	ctx.save();

	ctx.clearStory();
	ctx.addHeadline('Graduation Day');

	if (player.recruitingStars >= 4) {
		ctx.addText(
			'The college offers are pouring in. You did it. '
			+ 'All those early mornings and late practices paid off.'
		);
	} else if (player.recruitingStars >= 2) {
		ctx.addText(
			'A few colleges showed interest. Not the biggest programs, '
			+ 'but a chance is all you need.'
		);
	} else {
		ctx.addText(
			'The recruiting trail was quiet, but you refuse to give up. '
			+ 'There has to be a program willing to take a chance on you.'
		);
	}

	ctx.addText('The next chapter begins...');

	ui.showChoices([
		{
			text: 'Head to college',
			primary: true,
			action: () => {
				if (onBeginCollege) {
					onBeginCollege();
				}
			},
		},
	]);
}
