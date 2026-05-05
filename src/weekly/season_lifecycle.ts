// season_lifecycle.ts - Season lifecycle functions
// These functions form the outer boundary of the season engine.

import { Player, createEmptySeasonStats } from '../player.js';
import { CareerContext, SeasonConfig } from '../core/year_handler.js';
import { LeagueSeason } from '../season/season_model.js';
import { PlayoffBracket, createHSPlayoffBracket, createCollegePlayoffBracket, createNFLPlayoffBracket } from '../season/playoff_bracket.js';
import { PlayoffSeed } from '../season/season_types.js';
import { getArcPhase, getPhaseTransitionText } from '../season_arc.js';
import { getPlayerOpponentName } from '../season/season_simulator.js';
import { Activity, createWeekState } from '../activities.js';
import { activeEngine, setActiveEngine, EngineState } from './engine_state.js';
import * as weekPhases from './week_phases.js';
import * as playoffHandler from './playoff_handler.js';

//============================================
// Start a new season. Engine takes over the weekly loop.
// Accepts a LeagueSeason as the single source of truth.
export function startSeason(
	player: Player,
	ctx: CareerContext,
	config: SeasonConfig,
	season: LeagueSeason,
	onSeasonEnd: () => void,
): void {
	// Reset player season tracking
	player.currentWeek = 0;
	player.seasonStats = createEmptySeasonStats();
	player.currentSeason += 1;

	// Reset season arc and crisis state
	player.activeCrisis = null;
	player.scheduledCrises = [];
	player.crisisTriggeredThisSeason = false;

	// Clear seen events so they can repeat in new seasons
	player.seenEventIds = {};

	const engineState = {
		season,
		config,
		weekState: createWeekState(),
		onSeasonEnd,
		ctx,
	};
	setActiveEngine(engineState);

	// Hide the main action bar - weekly engine uses popups for all decisions
	ctx.hideMainActionBar();

	// Show goal selection at season start
	weekPhases.showGoalSelection(player, ctx, 'What is your goal this season?', () => {
		advanceToNextWeek(player, ctx);
	});
}

//============================================
// Core advancement function. This is the only way weeks advance.
// GUARANTEE: this function always either starts a new week or ends the season.
//
// WEEK-END UI CHECKLIST (things that must update when a new week starts):
//   [x] player.currentWeek - mirrored from season for save compatibility
//   [x] weekState - reset to fresh focus phase
//   [x] header - shows new age/week/team via ctx.updateHeader
//   [x] story panel - cleared and shows week intro headline
//   [x] opponent display - current week opponent from schedule
//   [x] arc phase - transition text if season arc phase changed
//   [x] season goal - re-prompt every 5 weeks
//   [x] stat bars - refreshed via refreshDashboard (called by tab switch)
//   [x] sidebar record - updated via refreshDashboard -> updateSidebar
//   [x] sidebar "This Week" checklist - reset via refreshDashboard
//   [x] week card - opponent and pressure updated via refreshDashboard
//   [x] tab content - refreshed on next tab switch via tab_manager.ts
//
// If adding a new UI element that shows weekly state, add it here and
// verify it updates in refreshDashboard or refreshTabContent.
export function advanceToNextWeek(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}

	// Advance the season week (strict: refuses if games are unfinished)
	const hasMoreWeeks = activeEngine.season.advanceWeek();

	// Mirror week to player for save compatibility
	player.currentWeek = activeEngine.season.getCurrentWeek();

	// Check if season is over
	if (!hasMoreWeeks) {
		endSeason(player, ctx);
		return;
	}

	// Reset weekly state
	activeEngine.weekState = createWeekState();
	activeEngine.weekState.phase = 'focus';

	// Update header and show week intro
	ctx.updateHeader(player);
	ctx.clearStory();
	ctx.addHeadline(`Week ${player.currentWeek}`);

	// Show the opponent for this week from the season schedule
	const opponentName = getPlayerOpponentName(activeEngine.season);
	if (opponentName !== 'TBD') {
		ctx.addText(`This week: vs ${opponentName}`);
	}

	// Detect arc phase and show transition text if phase changed
	const arcPhase = getArcPhase(player.currentWeek, activeEngine.config.seasonLength);
	const prevArcPhase = player.currentWeek > 1
		? getArcPhase(player.currentWeek - 1, activeEngine.config.seasonLength)
		: 'preseason';
	if (arcPhase !== prevArcPhase) {
		ctx.addText(getPhaseTransitionText(arcPhase));
	}

	// Every 5 games, re-prompt the player about their season goal
	if (player.currentWeek > 0 && player.currentWeek % 5 === 0) {
		weekPhases.showGoalSelection(player, ctx, 'Check-in: adjust your season goal?', () => {
			weekPhases.applyGoalAndAdvance(player, ctx);
		});
	} else {
		// Apply season goal effects (no weekly popup)
		weekPhases.applyGoalAndAdvance(player, ctx);
	}
}

//============================================
// End the season. Called when advanceToNextWeek finds no more weeks.
//
// SEASON-END UI CHECKLIST (things that must update when a season ends):
//   [x] story panel - cleared, shows final record headline
//   [x] careerHistory - season record pushed in finalizeSeason
//   [x] playoffs - bracket created and run if team qualifies
//   [x] sidebar record - will read from careerHistory after engine clears
//   [x] Career tab - shows updated careerHistory on next tab switch
//   [x] Team tab - standings frozen at final week
//   [x] tab bar - stays on current phase tabs until year_runner changes phase
//
// After finalizeSeason, activeEngine is set to null. The handler's
// onSeasonEnd callback runs next (typically calls advanceToNextYear).
//
// YEAR-END UI CHECKLIST (things that update in advanceToNextYear):
//   [x] player.age - incremented
//   [x] player.phase - set from handler id via getPhaseForHandler
//   [x] tab bar - synced to new phase via syncTabsToPhase (tab_manager.ts)
//   [x] header - updated by new handler's startYear via ctx.updateHeader
//   [x] stat bars - refreshed when new handler calls ctx.updateStats
//   [x] sidebar - refreshed on next refreshDashboard call
//   [x] team palette - may change if joining a new team (HS, college, NFL)
//   [x] team name - updated by handler (player.teamName)
//   [x] depth chart - reset or promoted by handler
//
// If adding a new UI element that shows season/year state, add it to
// the relevant checklist and verify it updates.
export function endSeason(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}

	// Read final record from the season (single source of truth)
	const record = activeEngine.season.getPlayerRecord();

	ctx.clearStory();
	ctx.addHeadline('Regular Season Complete');
	ctx.addText(`Final record: ${record.wins}-${record.losses}`);

	// Check if playoffs should happen
	if (activeEngine.config.hasPlayoffs) {
		const standings = activeEngine.season.getStandings();
		const playerTeamId = activeEngine.season.playerTeamId;

		// Find player's rank in standings
		const playerRank = standings.findIndex(row => row.teamId === playerTeamId);

		// Determine playoff bracket type and size based on phase
		let playoffSize = 4;
		let bracket: PlayoffBracket | undefined;

		if (playerRank >= 0 && playerRank < playoffSize) {
			// Build playoff seeds based on phase
			const seeds: PlayoffSeed[] = standings.slice(0, playoffSize).map((row, i) => ({
				teamId: row.teamId,
				seed: i + 1,
				wins: row.wins,
				losses: row.losses,
			}));

			// Create appropriate bracket for the player's phase
			if (player.phase === 'high_school') {
				bracket = createHSPlayoffBracket(seeds, playerTeamId);
			} else if (player.phase === 'college') {
				bracket = createCollegePlayoffBracket(seeds, playerTeamId);
			} else if (player.phase === 'nfl') {
				// NFL uses 7 seeds per conference, but simplified to top 4 for this system
				bracket = createNFLPlayoffBracket(seeds, playerTeamId);
			}

			if (bracket) {
				ctx.addText('Your team made the playoffs!');
				playoffHandler.startPlayoffs(player, ctx, bracket);
				return;
			}
		}

		// Didn't make playoffs
		ctx.addText('Your team did not qualify for the playoffs.');
	}

	// No playoffs or didn't qualify: finalize season
	finalizeSeason(player, ctx);
}

//============================================
// Finalize the season: save to career history and call handler callback
export function finalizeSeason(player: Player, ctx: CareerContext, isChampion: boolean = false): void {
	if (!activeEngine) {
		return;
	}

	const record = activeEngine.season.getPlayerRecord();

	// Build awards array
	const awards: string[] = [];
	if (isChampion) {
		awards.push('Champion');
	}

	// Save season to career history
	player.careerHistory.push({
		phase: player.phase,
		year: player.currentSeason,
		age: player.age,
		team: player.teamName,
		position: player.position,
		wins: record.wins,
		losses: record.losses,
		ties: record.ties,
		depthChart: player.depthChart,
		highlights: [],
		awards,
		statTotals: { ...player.seasonStats },
	});

	ctx.save();

	// Call the handler's season-end callback
	const callback = activeEngine.onSeasonEnd;
	setActiveEngine(null);
	callback();
}
