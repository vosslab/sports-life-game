// college_phase.ts - college football phase loop extracted from main.ts
//
// Handles the college phase: recruit school assignment, seasonal progression,
// weekly focus, game simulation, and draft declaration.

import {
	Player, randomInRange, clampStat, DepthChartStatus,
	accumulateGameStats, createEmptySeasonStats,
} from './player.js';
import { Team, Conference, generateHighSchoolTeam, generateConference } from './team.js';
import {
	WeeklyFocus, applyWeeklyFocus,
	evaluateDepthChartUpdate, runPracticeSession,
} from './week_sim.js';
import {
	GameContext, resetWeekState, getWeekState,
	showWeeklyFocusUI, handleWeeklyFocus, applyGoalAndProceed, proceedToEventCheck,
	simulateWeekSilently, showYearRecap,
} from './game_loop.js';
import type { YearSimRecap } from './game_loop.js';
import {
	NCAASchool, generateCollegeSchedule, formatSchoolName,
	assignPlayerCollege,
} from './ncaa.js';
import { generateNILDeal, calculateDraftStock, checkDeclarationEligibility } from './college.js';
import { simulateGame } from './week_sim.js';
import { generateTeamPalette, applyPalette } from './theme.js';
import * as ui from './ui.js';

//============================================
// Module state for college phase
let collegeTeam: Team | null = null;
let currentConference: Conference | null = null;
const COLLEGE_SEASON_WEEKS: number = 12;
let allCollegeSchools: NCAASchool[] = [];

// Reference to player's assigned NCAA school (for schedule generation)
let playerNCAASchool: NCAASchool | null = null;

// Game context injected by caller
let ctx: GameContext | null = null;

// Callback to transition to NFL career
let onStartNFLCareer: (() => void) | null = null;

//============================================
// Getters used by main.ts for tab and header summaries
export function getCollegeTeam(): Team | null {
	return collegeTeam;
}

export function getCollegeConference(): Conference | null {
	return currentConference;
}

//============================================
// Entry point: begin college phase with NCAA school assignment
export function beginCollege(
	context: GameContext,
	ncaaSchools: { fbs: NCAASchool[]; fcs: NCAASchool[] },
	startNFLCareer: () => void,
	selectedSchool?: NCAASchool,
	initialDepthChart: DepthChartStatus = 'backup',
): void {
	ctx = context;
	onStartNFLCareer = startNFLCareer;
	const player = ctx.getPlayer();

	if (!player) {
		return;
	}

	// Reset college-related state (only if not set by handler system)
	if (!player.collegeYear) {
		player.collegeYear = 0;
	}
	// Set initial draft stock based on current attributes
	player.draftStock = calculateDraftStock(player);
	collegeTeam = null;
	currentConference = null;
	allCollegeSchools = [...ncaaSchools.fbs, ...ncaaSchools.fcs];

	// Assign NCAA school based on recruiting stars
	if (allCollegeSchools.length > 0) {
		// Assign a real NCAA school based on recruiting stars
		playerNCAASchool = selectedSchool || assignPlayerCollege(
			player.recruitingStars,
			allCollegeSchools
		);
		player.teamName = formatSchoolName(playerNCAASchool);

		// Generate conference for college
		const playerTeamStrength = (player.core.athleticism
			+ player.core.technique) / 2;
		currentConference = generateConference(
			player.teamName,
			playerTeamStrength
		);
	}

	// Apply new team colors for college
	const collegePalette = generateTeamPalette();
	applyPalette(collegePalette);
	player.teamPalette = collegePalette;

	ctx.clearStory();
	ctx.addHeadline('College Football');
	ctx.addText(`You have committed to ${player.teamName}. `
		+ 'Your college career is about to begin.');

	player.depthChart = initialDepthChart;
	ctx.save();
	ui.updateHeader(player);

	ui.showChoices([
		{ text: 'Start Freshman Season', primary: true, action: startCollegeSeason },
	]);
}

//============================================
// Start a new college season (freshman through senior)
// Resume entry point for loading a saved college game
export function resumeCollegeSeason(): void {
	startCollegeSeason();
}

//============================================
function startCollegeSeason(): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	if (!player) {
		return;
	}

	player.collegeYear += 1;
	player.currentSeason += 1;
	player.currentWeek = 0;
	// Reset season stats for new college year
	player.seasonStats = createEmptySeasonStats();

	// Generate college team (reuse same team name across years)
	// Use NCAA schedule if player has an assigned school, else fall back to HS generator
	const seasonSchools = playerNCAASchool
		? [playerNCAASchool]
		: [];

	if (!collegeTeam) {
		collegeTeam = generateHighSchoolTeam(player.teamName);
		// College teams are stronger than high school
		collegeTeam.strength = randomInRange(55, 95);
		// Sync player teamStrength so other systems can reference it
		player.teamStrength = collegeTeam.strength;
		// Replace schedule with real NCAA schedule if available
		if (playerNCAASchool && seasonSchools.length > 0) {
			const ncaaSchedule = generateCollegeSchedule(playerNCAASchool, seasonSchools);
			collegeTeam.schedule = ncaaSchedule.map(entry => ({
				opponentName: entry.opponentName,
				opponentStrength: entry.opponentStrength,
				week: entry.week,
				played: false,
				teamScore: 0,
				opponentScore: 0,
			}));
		}
	} else {
		// New season: reset record, regenerate schedule
		collegeTeam.wins = 0;
		collegeTeam.losses = 0;
		// Cap strength to prevent unrealistic power creep over 4 years
		collegeTeam.strength = Math.min(95, collegeTeam.strength + randomInRange(1, 3));
		// Generate new season schedule
		if (playerNCAASchool && seasonSchools.length > 0) {
			const ncaaSchedule = generateCollegeSchedule(playerNCAASchool, seasonSchools);
			collegeTeam.schedule = ncaaSchedule.map(entry => ({
				opponentName: entry.opponentName,
				opponentStrength: entry.opponentStrength,
				week: entry.week,
				played: false,
				teamScore: 0,
				opponentScore: 0,
			}));
		} else {
			const tempTeam = generateHighSchoolTeam('temp');
			collegeTeam.schedule = tempTeam.schedule;
		}
	}

	ctx.clearStory();
	const yearLabels = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
	const yearLabel = yearLabels[player.collegeYear - 1] || `Year ${player.collegeYear}`;
	ctx.addHeadline(`College ${yearLabel} Season`);
	ctx.addText(
		`${player.teamName} - ${yearLabel} year. `
		+ `The competition is faster, stronger, and smarter than high school.`
	);

	// Promotion check at start of season
	if (player.collegeYear >= 2 && player.depthChart === 'backup') {
		if (player.core.technique >= 65
			&& player.core.confidence >= 55
			&& player.core.footballIq >= 50
			&& randomInRange(1, 100) <= 65) {
			player.depthChart = 'starter';
			ctx.addText(
				'Coach called your name at the team meeting. '
				+ 'You earned the starting job.'
			);
		} else {
			ctx.addText(
				'Still fighting for a starting spot. Keep working.'
			);
		}
	}

	ctx.save();
	ui.updateHeader(player);
	ui.updateAllStats(player);

	// Update life status bar with initial record and first opponent
	const firstOpp = collegeTeam.schedule.length > 0
		? `Week 1 vs ${collegeTeam.schedule[0].opponentName}`
		: 'Week 1';
	ui.updateLifeStatus('Record: 0-0', firstOpp);

	// Configure main action bar for college season
	ui.configureMainButtons({
		nextLabel: 'Next Week',
		nextAction: startCollegeWeek,
		ageUpVisible: true,
		ageUpAction: simulateCollegeSeason,
	});
	ui.showMainActionBar();

	ui.showChoices([
		{ text: 'Begin Week 1', primary: true, action: startCollegeWeek },
	]);
}

//============================================
// Simulate remaining college season weeks silently (Age Up)
function simulateCollegeSeason(): void {
	if (!ctx || !collegeTeam) {
		return;
	}
	const player = ctx.getPlayer();

	const recap: YearSimRecap = {
		weeksSimulated: 0,
		wins: 0,
		losses: 0,
		events: [],
	};

	const startWins = collegeTeam.wins;
	const startLosses = collegeTeam.losses;

	// Simulate remaining weeks
	while (player.currentWeek < COLLEGE_SEASON_WEEKS) {
		player.currentWeek += 1;
		recap.weeksSimulated += 1;

		// Silent focus + event resolution
		const weekResult = simulateWeekSilently();
		if (weekResult.eventTitle) {
			recap.events.push(weekResult.eventTitle);
		}

		// Simulate game
		const schedIdx = player.currentWeek - 1;
		if (schedIdx < collegeTeam.schedule.length) {
			const opponent = collegeTeam.schedule[schedIdx];
			const collegeOpponentStrength = Math.min(
				100, opponent.opponentStrength + randomInRange(10, 20)
			);

			const result = simulateGame(
				player, collegeTeam, collegeOpponentStrength
			);

			opponent.played = true;
			opponent.teamScore = result.teamScore;
			opponent.opponentScore = result.opponentScore;

			if (result.result === 'win') {
				collegeTeam.wins += 1;
				player.core.confidence = clampStat(
					player.core.confidence + randomInRange(1, 3)
				);
			} else {
				collegeTeam.losses += 1;
				player.core.confidence = clampStat(
					player.core.confidence + randomInRange(-3, 0)
				);
			}

			// Accumulate stats
			accumulateGameStats(player, result.playerStatLine);

			// Draft stock for juniors/seniors
			if (player.collegeYear >= 3) {
				player.draftStock = calculateDraftStock(player);
			}
		}
	}

	recap.wins = collegeTeam.wins - startWins;
	recap.losses = collegeTeam.losses - startLosses;

	ctx.save();
	ui.updateAllStats(player);

	// Show recap, then proceed to season end
	showYearRecap(recap, endCollegeSeason);
}

//============================================
// Start a new week in college season
function startCollegeWeek(): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	if (!player || !collegeTeam) {
		return;
	}

	// Reset weekly state for new week
	resetWeekState();

	player.currentWeek += 1;
	ctx.save();

	ctx.clearStory();
	ctx.addHeadline(
		`Week ${player.currentWeek} of ${COLLEGE_SEASON_WEEKS}`
	);

	// Show opponent
	const schedIdx = player.currentWeek - 1;
	if (schedIdx < collegeTeam.schedule.length) {
		const opp = collegeTeam.schedule[schedIdx];
		ctx.addText(`This week: vs ${opp.opponentName}`);
	}

	// Apply season goal and proceed (no weekly focus popup)
	applyGoalAndProceed(
		'college',
		proceedToCollegeGame,
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

			// Check for NIL deal when goal is 'popular' (brand building)
			if (player.seasonGoal === 'popular' && player.collegeYear >= 2) {
				const nilDeal = generateNILDeal(player);
				if (nilDeal) {
					ctx!.addText(nilDeal.storyText);
					player.career.money += nilDeal.amount;
					ctx!.save();
				}
			}
		},
	);
}

//============================================
// Proceed to college game simulation
function proceedToCollegeGame(): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	if (!player || !collegeTeam) {
		return;
	}

	const schedIdx = player.currentWeek - 1;
	if (schedIdx >= collegeTeam.schedule.length) {
		endCollegeSeason();
		return;
	}

	const opponent = collegeTeam.schedule[schedIdx];

	// College opponents are tougher
	const collegeOpponentStrength = Math.min(
		100, opponent.opponentStrength + randomInRange(10, 20)
	);

	const result = simulateGame(
		player, collegeTeam, collegeOpponentStrength
	);

	// Record result
	opponent.played = true;
	opponent.teamScore = result.teamScore;
	opponent.opponentScore = result.opponentScore;

	if (result.result === 'win') {
		collegeTeam.wins += 1;
		player.core.confidence = clampStat(
			player.core.confidence + randomInRange(1, 3)
		);
	} else {
		collegeTeam.losses += 1;
		player.core.confidence = clampStat(
			player.core.confidence + randomInRange(-3, 0)
		);
	}

	// Draft stock updates for juniors/seniors
	if (player.collegeYear >= 3) {
		const draftStock = calculateDraftStock(player);
		player.draftStock = draftStock;
	}

	ctx.save();
	ui.updateAllStats(player);

	ctx.clearStory();
	ctx.addHeadline('Game Day');
	ctx.addText(result.storyText);
	ctx.addResult(`Grade: ${result.playerGrade}`);

	// Accumulate stats on player object
	accumulateGameStats(player, result.playerStatLine);

	// Stat line with human-readable labels
	const formattedStats = ui.formatStatLine(result.playerStatLine);
	if (formattedStats.length > 0) {
		ctx.addResult(formattedStats);
	}
	ctx.addResult(
		`${collegeTeam.teamName} ${result.teamScore} - `
		+ `${opponent.opponentName} ${result.opponentScore}`
	);

	const depthUpdate = evaluateDepthChartUpdate(player, result.playerGrade);
	if (depthUpdate.changed) {
		ctx.addText(depthUpdate.message);
		ctx.save();
		ui.updateHeader(player);
	}

	// Show draft stock for juniors/seniors
	if (player.collegeYear >= 3) {
		ctx.addText(`Draft stock: ${player.draftStock}/100`);
	}

	// Update life status bar with record, next opponent, and conference/draft info
	const collegeRecordStr = `Record: ${collegeTeam.wins}-${collegeTeam.losses}`;
	const nextCollegeWeek = player.currentWeek < COLLEGE_SEASON_WEEKS
		? `Week ${player.currentWeek + 1} vs ${
			collegeTeam.schedule[player.currentWeek]?.opponentName || 'TBD'
		}`
		: 'End of Season';
	// Show conference record and draft stock when available
	const confTeam = currentConference?.teams.find(t => t.name === player.teamName);
	let collegeExtra = confTeam
		? `Conference: ${confTeam.wins}-${confTeam.losses}`
		: '';
	if (player.collegeYear >= 3) {
		collegeExtra += collegeExtra
			? ` | Draft Stock: ${player.draftStock}`
			: `Draft Stock: ${player.draftStock}`;
	}
	ui.updateLifeStatus(collegeRecordStr, nextCollegeWeek, collegeExtra);

	// Check if season is over
	if (player.currentWeek >= COLLEGE_SEASON_WEEKS) {
		ui.showChoices([
			{ text: 'Season Summary', primary: true, action: endCollegeSeason },
		]);
	} else {
		ui.showChoices([
			{ text: 'Next Week', primary: true, action: startCollegeWeek },
		]);
	}
}

//============================================
// End college season and show year-end decisions
function endCollegeSeason(): void {
	if (!ctx) {
		return;
	}
	// Hide main action bar during offseason
	ui.hideMainActionBar();
	const player = ctx.getPlayer();

	if (!player || !collegeTeam) {
		return;
	}

	ctx.clearStory();
	const yearLabels = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
	const yearLabel = yearLabels[player.collegeYear - 1] || `Year ${player.collegeYear}`;
	ctx.addHeadline(`${yearLabel} Season Over`);
	ctx.addText(
		`Final record: ${collegeTeam.wins}-${collegeTeam.losses}`
	);

	// Season narrative
	// Guard against division by zero
	const collegeTotal = collegeTeam.wins + collegeTeam.losses;
	const winPct = collegeTotal > 0 ? collegeTeam.wins / collegeTotal : 0;
	if (winPct >= 0.75) {
		ctx.addText(
			'An incredible season. Bowl game bound. '
			+ 'The scouts are paying serious attention.'
		);
	} else if (winPct >= 0.5) {
		ctx.addText(
			'A solid winning season at the college level.'
		);
	} else {
		ctx.addText(
			'A tough season. But you grew as a player.'
		);
	}

	// Starter promotion
	if (player.depthChart === 'backup'
		&& player.core.technique >= 60
		&& player.core.footballIq >= 55
		&& randomInRange(1, 100) <= 60) {
		player.depthChart = 'starter';
		ctx.addText('You earned the starting job for next season.');
	}

	// Record season
	player.careerHistory.push({
		phase: 'college',
		year: player.seasonYear,
		age: player.age,
		team: player.teamName,
		position: player.position,
		wins: collegeTeam.wins,
		losses: collegeTeam.losses,
		ties: 0,
		depthChart: player.depthChart,
		highlights: [],
		awards: [],
	});

	// Age advances after the season, not before (freshmen are 18, not 19)
	player.age += 1;
	player.seasonYear += 1;
	player.currentWeek = 0;
	ctx.save();
	ui.updateHeader(player);

	// Update status bar with final season record
	ui.updateLifeStatus(
		`Record: ${collegeTeam.wins}-${collegeTeam.losses}`,
		'Season Over'
	);

	// Show end-of-year options
	const buttons: { text: string; primary: boolean; action: () => void }[] = [];

	// Draft declaration: seniors must enter, juniors can declare if eligible
	if (player.collegeYear >= 4) {
		// Senior: must enter draft, no option to stay
		buttons.push({
			text: 'Enter NFL Draft',
			primary: true,
			action: declareForDraft,
		});
	} else if (player.collegeYear >= 3) {
		// Junior: optional early declaration if eligible
		const declareCheck = checkDeclarationEligibility(
			player, player.collegeYear
		);
		if (declareCheck.canDeclare) {
			buttons.push({
				text: 'Declare for NFL Draft',
				primary: true,
				action: declareForDraft,
			});
		}
	}

	if (player.collegeYear < 4) {
		buttons.push({
			text: 'Enter Transfer Portal',
			primary: false,
			action: transferCollegeTeam,
		});
		buttons.push({
			text: 'Next Season',
			primary: buttons.length === 0,
			action: startCollegeSeason,
		});
	}

	ui.waitForInteraction('Season Over', buttons);
}

//============================================
function transferCollegeTeam(): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	if (!player || allCollegeSchools.length === 0) {
		startCollegeSeason();
		return;
	}

	const currentSchoolName = playerNCAASchool
		? formatSchoolName(playerNCAASchool)
		: player.teamName;
	const portalCandidates = allCollegeSchools.filter(
		(school) => formatSchoolName(school) !== currentSchoolName
	);

	if (portalCandidates.length === 0) {
		startCollegeSeason();
		return;
	}

	playerNCAASchool = assignPlayerCollege(
		Math.max(1, player.recruitingStars),
		portalCandidates
	);
	player.teamName = formatSchoolName(playerNCAASchool);
	player.bigDecisions.push(`Transferred to ${player.teamName}`);

	// Fresh start: most transfers have to re-earn their place.
	const immediateStarterChance = player.core.technique >= 70
		&& player.core.footballIq >= 65
		&& randomInRange(1, 100) <= 25;
	player.depthChart = immediateStarterChance ? 'starter' : 'backup';

	// Reset college team so the next season rebuilds around the new school
	collegeTeam = null;
	const playerTeamStrength = (player.core.athleticism + player.core.technique) / 2;
	currentConference = generateConference(player.teamName, playerTeamStrength);

	const transferPalette = generateTeamPalette();
	applyPalette(transferPalette);
	player.teamPalette = transferPalette;

	ctx.clearStory();
	ctx.addHeadline('Transfer Portal');
	ctx.addText(
		`You entered the portal and landed at ${player.teamName}. `
		+ 'New coaches. New locker room. New chance.'
	);
	if (player.depthChart === 'starter') {
		ctx.addText(
			'Your tape was strong enough that the staff expects you to compete with the starters immediately.'
		);
	} else {
		ctx.addText(
			'The new staff likes your talent, but they are not handing you a starting role. '
			+ 'You will have to earn it.'
		);
	}

	ctx.save();
	ui.updateHeader(player);
	ui.updateAllStats(player);

	ui.showChoices([
		{ text: 'Start Next Season', primary: true, action: startCollegeSeason },
	]);
}

//============================================
// Declare for NFL draft and transition to NFL career
function declareForDraft(): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	if (!player) {
		return;
	}

	player.phase = 'nfl';
	ctx.save();

	ctx.clearStory();
	ctx.addHeadline('Declaring for the NFL Draft');

	if (player.draftStock >= 80) {
		ctx.addText(
			'You are projected as a first-round pick. '
			+ 'The dream is about to become reality.'
		);
	} else if (player.draftStock >= 50) {
		ctx.addText(
			'You have a shot at the mid rounds. '
			+ 'Not a lock, but your name is on the board.'
		);
	} else {
		ctx.addText(
			'You are a long shot, but stranger things have happened. '
			+ 'All it takes is one team to believe in you.'
		);
	}

	ui.showChoices([
		{
			text: 'Draft Day',
			primary: true,
			action: () => {
				if (onStartNFLCareer) {
					onStartNFLCareer();
				}
			},
		},
	]);
}
