// nfl_phase.ts - NFL career phase with weekly loop
//
// The NFL has a 17-week season. Each week follows the shared rhythm:
//   - Weekly focus (train, film study, recovery, social, teamwork)
//   - Optional activities
//   - Random events
//   - Game day
//   - Proceed to next week or end season
//
// Draft day occurs once when startNFLCareer is called. After that,
// startNFLSeason begins each new season.

import {
	Player, CareerPhase, randomInRange, clampStat,
	accumulateGameStats, createEmptySeasonStats,
} from './player.js';
import { Team, Conference, generateConference, simulateConferenceWeek } from './team.js';
import { WeeklyFocus } from './week_sim.js';
import { simulateGame, evaluateDepthChartUpdate, runPracticeSession } from './week_sim.js';
import { generateNFLPalette, applyPalette } from './theme.js';
import { checkRetirement, getNFLDraftResult, getNFLTeams } from './nfl.js';
import {
	showWeeklyFocusUI, handleWeeklyFocus, proceedToEventCheck,
	initGameLoop,
} from './game_loop.js';
import type { GameContext } from './game_loop.js';
import { updateTabBar, switchTab } from './tabs.js';
import * as ui from './ui.js';

//============================================
// Module-level state for current NFL season
let nflTeam: Team | null = null;
let nflConference: Conference | null = null;

const NFL_SEASON_WEEKS = 17;
const MAX_NFL_SEASONS = 15;

// Track weekly and season stats for awards
interface SeasonStats {
	totalYards: number;
	totalTouchdowns: number;
	totalTackles: number;
	totalInterceptions: number;
	gamesPlayed: number;
	playerOfTheWeekCount: number;
}

let currentSeasonStats: SeasonStats = {
	totalYards: 0,
	totalTouchdowns: 0,
	totalTackles: 0,
	totalInterceptions: 0,
	gamesPlayed: 0,
	playerOfTheWeekCount: 0,
};

// Context provided by main.ts
let ctx: GameContext | null = null;
let onRetireCallback: () => void = () => {};

//============================================
// Ordinal suffix helper (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(n: number): string {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) {
		return 'st';
	}
	if (mod10 === 2 && mod100 !== 12) {
		return 'nd';
	}
	if (mod10 === 3 && mod100 !== 13) {
		return 'rd';
	}
	return 'th';
}

//============================================
// Generate combine narrative based on player stats
function generateCombineNarrative(player: Player): string {
	const ath = player.core.athleticism;
	const tech = player.core.technique;
	const iq = player.core.footballIq;
	const disc = player.core.discipline;

	// Athletic testing (40-yard dash, vertical, bench press)
	let athResult = '';
	if (ath >= 80) {
		athResult = 'You lit up the athletic testing. Scouts were writing furiously '
			+ 'after your 40-yard dash. Your vertical leap turned heads.';
	} else if (ath >= 60) {
		athResult = 'Solid athletic numbers. Nothing record-breaking, but you showed '
			+ 'you belong at this level.';
	} else {
		athResult = 'The athletic testing was rough. Your 40 time was slower than hoped '
			+ 'and the bench press numbers were underwhelming.';
	}

	// Position drills
	let techResult = '';
	if (tech >= 75) {
		techResult = ' Your position drills were crisp and precise. Coaches nodded approvingly.';
	} else if (tech >= 55) {
		techResult = ' Position drills were average. Nothing to move you up or down the board.';
	} else {
		techResult = ' You struggled with the position-specific drills. Some coaches looked concerned.';
	}

	// Interviews and whiteboard sessions
	let iqResult = '';
	if (iq >= 70 && disc >= 60) {
		iqResult = ' In the interview room, you impressed coaches with your football knowledge '
			+ 'and film preparation. Teams loved your maturity.';
	} else if (iq >= 50) {
		iqResult = ' Interviews went fine. You answered questions well enough, nothing memorable.';
	} else {
		iqResult = ' The interview sessions exposed some gaps in your football understanding. '
			+ 'A few teams flagged concerns about your readiness.';
	}

	const narrative = athResult + techResult + iqResult;
	return narrative;
}

//============================================
// Getters for nflTeam and nflConference (used by tab refresh in main.ts)
export function getNFLTeam(): Team | null {
	return nflTeam;
}

export function getNFLConference(): Conference | null {
	return nflConference;
}

//============================================
// Main entry point: draft day and first season start
export function startNFLCareer(gameContext: GameContext, onRetire: () => void): void {
	ctx = gameContext;
	onRetireCallback = onRetire;
	const player = ctx.getPlayer();

	// Update tab bar for NFL phase
	updateTabBar(player.phase);
	switchTab('life');

	ctx.clearStory();

	// NFL Combine results based on player stats
	ctx.addHeadline('NFL Scouting Combine');
	const combineNarrative = generateCombineNarrative(player);
	ctx.addText(combineNarrative);

	ctx.addHeadline('NFL Draft Day');

	// Use the proper draft result generator
	const draftResult = getNFLDraftResult(player);
	const team = draftResult.team;
	const round = draftResult.round;
	const pick = draftResult.pick;

	player.teamName = team;
	// Higher draft picks go to weaker teams, lower picks to stronger
	player.teamStrength = randomInRange(40, 90);
	// Apply real NFL team colors
	const nflPalette = generateNFLPalette(team);
	applyPalette(nflPalette);
	player.teamPalette = nflPalette;

	// Record draft details
	const draftLabel = round === 0
		? `Signed by ${team} as undrafted free agent`
		: `Drafted by ${team} - Round ${round}, Pick ${pick}`;
	player.bigDecisions.push(draftLabel);

	ctx.addText(draftResult.storyText);
	ctx.addResult(`Selected by the ${team}`);
	if (round > 0) {
		// Calculate overall pick number for display
		const picksPerRound = 32;
		const overallPick = (round - 1) * picksPerRound + (pick % picksPerRound || picksPerRound);
		ctx.addResult(`Round ${round}, Pick ${pick} (${overallPick}${getOrdinalSuffix(overallPick)} overall)`);
	} else {
		ctx.addResult('Undrafted Free Agent');
	}

	ctx.save();
	ui.updateHeader(player);

	ui.showChoices([
		{
			text: 'Begin NFL Career',
			primary: true,
			action: () => startNFLSeason(onRetire),
		},
	]);
}

//============================================
// Resume entry point for loading a saved NFL game
export function resumeNFLSeason(): void {
	startNFLSeason(onRetireCallback);
}

//============================================
function startNFLSeason(onRetire: () => void): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	player.nflYear += 1;
	player.age += 1;
	player.currentSeason += 1;
	player.currentWeek = 0;

	// Apply age-based stat decline once per season (not weekly)
	const ageFactor = Math.max(0, 1 - Math.pow((player.age - 27) / 10, 2));
	if (player.age >= 30) {
		// Athleticism and health decline after 30
		const athDecline = Math.floor((1 - ageFactor) * 5);
		const healthDecline = Math.floor((1 - ageFactor) * 3);
		player.core.athleticism = clampStat(
			player.core.athleticism - athDecline
		);
		player.core.health = clampStat(
			player.core.health - healthDecline
		);
	}
	if (player.age < 30) {
		// Prime growth: technique and IQ improve slightly
		player.core.technique = clampStat(
			player.core.technique + randomInRange(0, 2)
		);
		player.core.footballIq = clampStat(
			player.core.footballIq + randomInRange(0, 1)
		);
	}

	// Generate NFL team and schedule for this season
	nflTeam = generateNFLSeasonTeam(player);
	nflConference = generateConference(
		player.teamName, player.teamStrength
	);

	// Reset season stats
	currentSeasonStats = {
		totalYards: 0, totalTouchdowns: 0, totalTackles: 0,
		totalInterceptions: 0, gamesPlayed: 0, playerOfTheWeekCount: 0,
	};
	// Reset player-level season stats for new season
	player.seasonStats = createEmptySeasonStats();

	// Add career history entry for this season
	player.careerHistory.push({
		phase: 'nfl',
		year: player.nflYear,
		age: player.age,
		team: player.teamName,
		position: player.position,
		wins: 0,
		losses: 0,
		ties: 0,
		depthChart: player.depthChart,
		highlights: [],
		awards: [],
	});

	ctx.save();
	ui.updateAllStats(player);
	ui.updateHeader(player);

	ctx.clearStory();
	ctx.addHeadline(
		`NFL Season ${player.nflYear} - ${player.teamName}`
	);
	ctx.addText(
		`Age ${player.age}. Year ${player.nflYear} in the league.`
	);

	if (player.age >= 32) {
		ctx.addText('The years are starting to show. Every snap counts.');
	} else if (player.nflYear === 1) {
		ctx.addText('Rookie season. Time to prove you belong.');
	}

	ui.showChoices([
		{ text: 'Begin Week 1', primary: true, action: () => startNFLWeek(onRetire) },
	]);
}

//============================================
// Generate a Team object for the NFL season with 17-game schedule
function generateNFLSeasonTeam(player: Player): Team {
	// Get mascot names from CSV data, with hardcoded fallback
	const csvTeams = getNFLTeams();
	const nflTeamNames = csvTeams.length > 0
		? csvTeams.map(t => t.mascot)
		: [
			'Cardinals', 'Falcons', 'Ravens', 'Bills', 'Panthers', 'Bears',
			'Bengals', 'Browns', 'Cowboys', 'Broncos', 'Lions', 'Packers',
			'Texans', 'Colts', 'Jaguars', 'Chiefs', 'Raiders', 'Chargers',
			'Rams', 'Dolphins', 'Vikings', 'Patriots', 'Saints', 'Giants',
			'Jets', 'Eagles', 'Steelers', '49ers', 'Seahawks',
			'Buccaneers', 'Titans', 'Commanders',
		];

	// Build 17-game schedule with NFL-level opponent strength (55-95)
	const schedule: Array<{
		week: number;
		opponentName: string;
		opponentStrength: number;
		played: boolean;
		teamScore: number;
		opponentScore: number;
	}> = [];
	for (let w = 1; w <= NFL_SEASON_WEEKS; w++) {
		const oppIdx = randomInRange(0, nflTeamNames.length - 1);
		const oppStrength = randomInRange(55, 95);
		schedule.push({
			week: w,
			opponentName: nflTeamNames[oppIdx],
			opponentStrength: oppStrength,
			played: false,
			teamScore: 0,
			opponentScore: 0,
		});
	}

	const team: Team = {
		teamName: player.teamName,
		strength: player.teamStrength,
		coachPersonality: 'demanding',
		wins: 0,
		losses: 0,
		schedule: schedule,
	};
	return team;
}

//============================================
function startNFLWeek(onRetire: () => void): void {
	if (!ctx || !nflTeam) {
		return;
	}
	const player = ctx.getPlayer();

	player.currentWeek += 1;
	ctx.save();

	ctx.clearStory();
	ctx.addHeadline(
		`Week ${player.currentWeek} of ${NFL_SEASON_WEEKS}`
	);

	// Show opponent for this week
	const schedIdx = player.currentWeek - 1;
	if (schedIdx < nflTeam.schedule.length) {
		const opponent = nflTeam.schedule[schedIdx];
		ctx.addText(`This week: vs ${opponent.opponentName}`);
	}

	ctx.addText('What is your focus this week?');
	showWeeklyFocusUI(player.phase as CareerPhase, (focus: WeeklyFocus) => {
		handleNFLWeeklyFocus(focus, onRetire);
	});
}

//============================================
function handleNFLWeeklyFocus(focus: WeeklyFocus, onRetire: () => void): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	// Use the shared handleWeeklyFocus which applies focus, shows activities,
	// and leads to event check. Pass proceedToNFLGame as the onGameDay callback.
	handleWeeklyFocus(
		player.phase as CareerPhase,
		focus,
		() => proceedToNFLGame(onRetire),
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
function proceedToNFLGame(onRetire: () => void): void {
	if (!ctx || !nflTeam) {
		return;
	}
	const player = ctx.getPlayer();

	// Get this week's opponent
	const schedIdx = player.currentWeek - 1;
	if (schedIdx >= nflTeam.schedule.length) {
		endNFLSeason(onRetire);
		return;
	}

	const entry = nflTeam.schedule[schedIdx];

	// Simulate game using shared game engine
	const result = simulateGame(player, nflTeam, entry.opponentStrength);

	// Record result in schedule
	entry.played = true;
	entry.teamScore = result.teamScore;
	entry.opponentScore = result.opponentScore;

	// Update team record
	const playerWon = result.result === 'win';
	if (playerWon) {
		nflTeam.wins += 1;
	} else {
		nflTeam.losses += 1;
	}

	// Update career history
	const history = player.careerHistory;
	if (history.length > 0) {
		const current = history[history.length - 1];
		current.wins = nflTeam.wins;
		current.losses = nflTeam.losses;
	}

	// Update conference standings
	if (nflConference) {
		simulateConferenceWeek(
			nflConference, player.teamName, playerWon
		);
	}

	// Track season stats on player object and local counters
	accumulateGameStats(player.seasonStats, result.playerStatLine);
	currentSeasonStats.gamesPlayed += 1;
	const stats = result.playerStatLine;
	const passYds = Number(stats['passYards'] || 0);
	const rushYds = Number(stats['rushYards'] || 0);
	const recYds = Number(stats['recYards'] || 0);
	const totalYds = passYds + rushYds + recYds;
	currentSeasonStats.totalYards += totalYds;
	currentSeasonStats.totalTouchdowns += Number(stats['passTds'] || 0)
		+ Number(stats['rushTds'] || 0)
		+ Number(stats['recTds'] || 0);
	currentSeasonStats.totalTackles += Number(stats['tackles'] || 0);

	// Confidence adjustment
	if (playerWon) {
		player.core.confidence = clampStat(
			player.core.confidence + 1
		);
	} else {
		player.core.confidence = clampStat(
			player.core.confidence - 1
		);
	}

	// Show game result
	const winLoss = playerWon ? 'Win' : 'Loss';
	ctx.addHeadline('Game Day');
	ctx.addText(result.storyText);
	ctx.addResult(`Grade: ${result.playerGrade}`);
	ctx.addResult(`${winLoss}: ${result.teamScore}-${result.opponentScore}`);
	ctx.addResult(`Record: ${nflTeam.wins}-${nflTeam.losses}`);

	// Display formatted stat line
	const formattedStats = ui.formatStatLine(result.playerStatLine);
	if (formattedStats.length > 0) {
		ctx.addResult(formattedStats);
	}

	const depthUpdate = evaluateDepthChartUpdate(player, result.playerGrade);
	if (depthUpdate.changed) {
		ctx.addText(depthUpdate.message);
	}

	ctx.save();
	ui.updateAllStats(player);
	ui.updateHeader(player);

	// Check if season is over
	if (player.currentWeek >= NFL_SEASON_WEEKS) {
		ui.showChoices([
			{ text: 'Season Summary', primary: true, action: () => endNFLSeason(onRetire) },
		]);
	} else {
		ui.showChoices([
			{ text: 'Next Week', primary: true, action: () => startNFLWeek(onRetire) },
		]);
	}
}

//============================================
function endNFLSeason(onRetire: () => void): void {
	if (!ctx || !nflTeam) {
		return;
	}
	const player = ctx.getPlayer();

	ctx.clearStory();
	ctx.addHeadline(`Season ${player.nflYear} Complete`);
	ctx.addText(`Final record: ${nflTeam.wins}-${nflTeam.losses}`);

	// Calculate salary
	const baseSalary = player.depthChart === 'starter' ? 5000000 : 1500000;
	const salary = Math.floor(baseSalary * (1 + player.nflYear * 0.1));
	player.career.money += salary;
	ctx.addResult(`Season salary: $${salary.toLocaleString()}`);

	// Awards check
	const avgPerf = (player.core.athleticism
		+ player.core.technique
		+ player.core.footballIq) / 3;
	if (avgPerf >= 75 && nflTeam.wins >= 10) {
		ctx.addText('Selected to the Pro Bowl!');
		const hist = player.careerHistory;
		if (hist.length > 0) {
			hist[hist.length - 1].awards.push('Pro Bowl');
		}
	}
	if (avgPerf >= 85 && nflTeam.wins >= 12) {
		ctx.addText('Named All-Pro!');
		const hist = player.careerHistory;
		if (hist.length > 0) {
			hist[hist.length - 1].awards.push('All-Pro');
		}
	}

	// Promote to starter after good season
	if (player.depthChart === 'backup' && player.core.technique >= 55) {
		player.depthChart = 'starter';
		ctx.addText('You earned the starting job for next season.');
	}

	const backupYears = player.careerHistory.filter(
		(record) => record.phase === 'nfl' && record.depthChart === 'backup'
	).length;
	const stalledBackupCareer = player.depthChart === 'backup'
		&& backupYears >= 3;
	const maxSeasonReached = player.nflYear >= MAX_NFL_SEASONS;

	ctx.save();
	ui.updateAllStats(player);

	// Check for retirement
	const retirementCheck = checkRetirement(player);

	const buttons: { text: string; primary: boolean; action: () => void }[] = [];

	if (maxSeasonReached) {
		ctx.addText(
			`After ${player.nflYear} NFL seasons, there is nothing left to prove. `
			+ 'Your body and career have reached the finish line.'
		);
		buttons.push({
			text: 'Retire',
			primary: true,
			action: onRetire,
		});
	} else if (stalledBackupCareer) {
		ctx.addText(
			'You have spent too many years buried on the depth chart. '
			+ 'The calls around the league stop coming. Your NFL career is over.'
		);
		buttons.push({
			text: 'Retire',
			primary: true,
			action: onRetire,
		});
	} else if (retirementCheck.shouldRetire) {
		ctx.addText(retirementCheck.storyText);
		buttons.push({
			text: 'Retire',
			primary: true,
			action: onRetire,
		});
		buttons.push({
			text: 'One More Season',
			primary: false,
			action: () => startNFLSeason(onRetire),
		});
	} else {
		buttons.push({
			text: 'Next Season',
			primary: true,
			action: () => startNFLSeason(onRetire),
		});
	}

	ui.showChoices(buttons);
}
