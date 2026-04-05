// weekly_engine.ts - shared weekly loop with guaranteed advancement
//
// CONTRACT: every call to runSeasonWeek() must end in exactly one of:
//   - { kind: "next_week", nextWeek: N }
//   - { kind: "season_ended" }
//
// No third state. No conditional path that silently returns without advancing.
// Handlers call startSeason() then the engine drives the weekly loop.
//
// SOURCE OF TRUTH: LeagueSeason owns all season state (schedule, records,
// standings, week counter). This engine reads from it and writes results to it.

import { Player, CareerPhase, randomInRange, createEmptySeasonStats, modifyStat } from '../player.js';
import { CareerContext, SeasonConfig, WeekAdvanceResult } from '../core/year_handler.js';
import { WeeklyFocus, applyWeeklyFocus, simulateGame, evaluateDepthChartUpdate } from '../week_sim.js';
import { Team } from '../team.js';
import {
	Activity, WeekState, createWeekState, getActivitiesForPhase,
	isActivityUnlocked, applyActivity, getEffectPreview, formatActivityResult,
} from '../activities.js';
import {
	GameEvent, filterEvents, selectEvent, applyEventChoice,
} from '../events.js';
import { accumulateGameStats } from '../player.js';
import { switchTab, hideTabBar, showTabBar } from '../tabs.js';
import * as ui from '../ui.js';
import { checkMilestones } from '../milestones.js';

// Season layer imports
import { LeagueSeason } from '../season/season_model.js';
import {
	simulateNonPlayerGames, recordPlayerGameResult,
	getPlayerOpponentStrength, getPlayerOpponentName,
} from '../season/season_simulator.js';
import { PlayoffBracket, createHSPlayoffBracket, createCollegePlayoffBracket } from '../season/playoff_bracket.js';
import { PlayoffSeed } from '../season/season_types.js';

//============================================
// Engine state: minimal, just tracks weekly phase and callbacks
interface EngineState {
	season: LeagueSeason;
	config: SeasonConfig;
	weekState: WeekState;
	onSeasonEnd: () => void;
}

// Current active engine state (null when no season running)
let activeEngine: EngineState | null = null;

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

	activeEngine = {
		season,
		config,
		weekState: createWeekState(),
		onSeasonEnd,
	};

	// Start the first week
	advanceToNextWeek(player, ctx);
}

//============================================
// Core advancement function. This is the only way weeks advance.
// GUARANTEE: this function always either starts a new week or ends the season.
function advanceToNextWeek(player: Player, ctx: CareerContext): void {
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

	// Show weekly focus choices
	showFocusChoices(player, ctx);
}

//============================================
// Phase 1: Weekly focus selection
function showFocusChoices(player: Player, ctx: CareerContext): void {
	const socialLabel = player.phase === 'college' ? 'Social / NIL' : 'Social';

	const focusOptions: { text: string; key: WeeklyFocus }[] = [
		{ text: 'Train (TEC up, HP down)', key: 'train' },
		{ text: 'Film Study (IQ up)', key: 'film_study' },
		{ text: 'Recovery (HP up)', key: 'recovery' },
		{ text: `${socialLabel} (POP/CONF up, DISC down)`, key: 'social' },
		{ text: 'Teamwork (LEAD/DISC up)', key: 'teamwork' },
	];

	ctx.showChoices(focusOptions.map(opt => ({
		text: opt.text,
		primary: false,
		action: () => handleFocusSelected(player, ctx, opt.key),
	})));
}

//============================================
// Phase 2: Apply focus, show stat changes briefly, then activity prompt
function handleFocusSelected(
	player: Player, ctx: CareerContext, focus: WeeklyFocus,
): void {
	// Apply focus effects
	const focusStory = applyWeeklyFocus(player, focus);
	ctx.addText(focusStory);
	ctx.updateStats(player);
	ctx.save();

	if (!activeEngine) {
		return;
	}

	// Clear buttons during the stat review pause
	ctx.showChoices([]);

	// Brief pause to show stat changes, then present activity choices
	setTimeout(() => {
		if (!activeEngine) {
			return;
		}
		activeEngine.weekState.phase = 'activity_prompt';

		ctx.addText('Pick an activity or skip to game day.');

		// Build activity buttons inline
		const activities = getActivitiesForPhase(player.phase, player);
		const activityChoices = activities
			.filter(a => isActivityUnlocked(a, player))
			.map(a => {
				const preview = getEffectPreview(a);
				return {
					text: `${a.name} (${preview})`,
					primary: false,
					action: () => handleActivitySelected(player, ctx, a),
				};
			});

		// Add skip button at the end
		activityChoices.push({
			text: 'Skip to Game Day',
			primary: true,
			action: () => {
				if (activeEngine) {
					activeEngine.weekState.phase = 'activity_done';
				}
				proceedToEventCheck(player, ctx);
			},
		});

		ctx.showChoices(activityChoices);
	}, 1000);
}

//============================================
// Show activities in the Activities tab
function showActivities(player: Player, ctx: CareerContext): void {
	const activities = getActivitiesForPhase(player.phase, player);

	ui.renderActivitiesTab(
		activities,
		activeEngine ? activeEngine.weekState : createWeekState(),
		(activity: Activity) => isActivityUnlocked(activity, player),
		(activity: Activity) => getEffectPreview(activity),
		(activity: Activity) => handleActivitySelected(player, ctx, activity),
	);
}

//============================================
// Handle activity selection
function handleActivitySelected(
	player: Player, ctx: CareerContext, activity: Activity,
): void {
	const result = applyActivity(activity, player);

	if (activeEngine) {
		activeEngine.weekState.actionsUsed += 1;
		activeEngine.weekState.phase = 'activity_done';
	}

	ctx.updateStats(player);
	ctx.save();
	ctx.addText(result.flavorText);
	const appliedText = formatActivityResult(result);
	if (appliedText.length > 0) {
		ui.addStatChange(appliedText);
	}

	// Return to Life tab and proceed
	switchTab('life');
	proceedToEventCheck(player, ctx);
}

//============================================
// Phase 3: Random event check
function proceedToEventCheck(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}
	activeEngine.weekState.phase = 'event';

	const eventChance = activeEngine.config.eventChance;
	const eventRoll = randomInRange(1, 100);

	if (eventRoll <= eventChance && ctx.events.length > 0) {
		const statsRecord: Record<string, number> = {
			athleticism: player.core.athleticism,
			technique: player.core.technique,
			footballIq: player.core.footballIq,
			discipline: player.core.discipline,
			health: player.core.health,
			confidence: player.core.confidence,
		};

		// Filter events for current phase
		let eligible = filterEvents(
			ctx.events, player.phase,
			player.currentWeek, player.position,
			player.storyFlags, statsRecord,
		);

		// Fall back to HS events for NFL/college
		if (eligible.length === 0 && (player.phase === 'nfl' || player.phase === 'college')) {
			eligible = filterEvents(
				ctx.events, 'high_school',
				player.currentWeek, player.position,
				player.storyFlags, statsRecord,
			);
		}

		const event = selectEvent(eligible);
		if (event) {
			showEventCard(player, ctx, event);
			return;
		}
	}

	// No event: go straight to game
	proceedToGame(player, ctx);
}

//============================================
// Show event modal, then proceed to game
function showEventCard(
	player: Player, ctx: CareerContext, event: GameEvent,
): void {
	hideTabBar();

	const choiceActions = event.choices.map(choice => ({
		text: choice.text,
		action: () => {
			const flavor = applyEventChoice(player, choice);
			ctx.hideEventModal();
			showTabBar();

			ctx.addHeadline(event.title);
			ctx.addText(flavor);
			ctx.updateStats(player);
			ctx.save();

			// Show "Game Day" button to continue
			ctx.showChoices([{
				text: 'Game Day',
				primary: true,
				action: () => proceedToGame(player, ctx),
			}]);
		},
	}));

	ctx.showEventModal(event.title, event.description, choiceActions);
}

//============================================
// Phase 4: Game simulation
function proceedToGame(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}
	activeEngine.weekState.phase = 'game';

	// Get the player's game from the season schedule
	const playerGame = activeEngine.season.getPlayerGame();
	if (!playerGame) {
		// No game scheduled this week, advance directly
		advanceToNextWeek(player, ctx);
		return;
	}

	// Get opponent strength from the season
	const opponentStrength = getPlayerOpponentStrength(activeEngine.season);
	const opponentName = getPlayerOpponentName(activeEngine.season);

	// Build a minimal Team object for the simulation function
	const playerRecord = activeEngine.season.getPlayerRecord();
	const team: Team = {
		teamName: player.teamName,
		strength: player.teamStrength,
		wins: playerRecord.wins,
		losses: playerRecord.losses,
		schedule: [],
		coachPersonality: 'supportive',
	};

	// Simulate the game
	const gameResult = simulateGame(player, team, opponentStrength);

	// Record the result into the season (atomic: updates both teams)
	recordPlayerGameResult(activeEngine.season, gameResult);

	// Simulate all other games for this week
	simulateNonPlayerGames(activeEngine.season);

	// Accumulate stats
	accumulateGameStats(player.seasonStats, gameResult.playerStatLine);

	// Game outcome affects player stats
	if (gameResult.result === 'win') {
		modifyStat(player, 'confidence', randomInRange(1, 3));
	} else {
		// Losses hurt confidence, especially blowouts
		const margin = gameResult.opponentScore - gameResult.teamScore;
		if (margin >= 14) {
			modifyStat(player, 'confidence', -randomInRange(3, 6));
		} else {
			modifyStat(player, 'confidence', -randomInRange(1, 3));
		}
	}

	// Game-day wear: small health cost for starters only
	if (player.depthChart === 'starter') {
		modifyStat(player, 'health', -randomInRange(0, 2));
	}

	// Evaluate depth chart
	const depthUpdate = evaluateDepthChartUpdate(player, gameResult.playerGrade);
	if (depthUpdate.changed) {
		player.depthChart = depthUpdate.newStatus;
	}

	// Show game story
	ctx.addHeadline(
		`${player.teamName} ${gameResult.teamScore} - `
		+ `${opponentName} ${gameResult.opponentScore}`
	);
	ctx.addText(gameResult.storyText);
	if (depthUpdate.changed) {
		ctx.addResult(depthUpdate.message);
	}

	// Show stat line
	const statLineText = ui.formatStatLine(gameResult.playerStatLine);
	if (statLineText) {
		ctx.addText(`Stats: ${statLineText}`);
	}

	ctx.updateStats(player);
	ctx.updateHeader(player);
	ctx.save();

	// Check for milestones after game results
	const recordForMilestones = activeEngine.season.getPlayerRecord();
	const milestones = checkMilestones(player, recordForMilestones.wins, recordForMilestones.losses);
	for (const milestone of milestones) {
		ctx.addHeadline(milestone.headline);
		ctx.addText(milestone.text);
	}

	// Dev-mode invariant: verify sync after game recording
	const record = activeEngine.season.getPlayerRecord();
	const gamesPlayed = record.wins + record.losses + record.ties;
	const weekNum = activeEngine.season.getCurrentWeek();
	console.assert(
		gamesPlayed <= weekNum,
		`Sync check: games played (${gamesPlayed}) should not exceed week (${weekNum})`
	);

	// Show "Next Week" button - this is the ONLY path forward
	const isLastWeek = activeEngine.season.getCurrentWeek()
		>= activeEngine.config.seasonLength;
	ctx.showChoices([{
		text: isLastWeek ? 'End of Season' : 'Next Week',
		primary: true,
		action: () => advanceToNextWeek(player, ctx),
	}]);
}

//============================================
// End the season
function endSeason(player: Player, ctx: CareerContext): void {
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

		// Top 4 make playoffs (HS/college bracket size)
		if (playerRank >= 0 && playerRank < 4) {
			// Build playoff seeds from top 4 standings
			const seeds: PlayoffSeed[] = standings.slice(0, 4).map((row, i) => ({
				teamId: row.teamId,
				seed: i + 1,
				wins: row.wins,
				losses: row.losses,
			}));

			const bracket = createHSPlayoffBracket(seeds, playerTeamId);
			ctx.addText('Your team made the playoffs!');
			startPlayoffs(player, ctx, bracket);
			return;
		}

		// Didn't make playoffs
		ctx.addText('Your team did not qualify for the playoffs.');
	}

	// No playoffs or didn't qualify: finalize season
	finalizeSeason(player, ctx);
}

//============================================
// Run playoff bracket: show matchup, simulate game, advance
function startPlayoffs(
	player: Player, ctx: CareerContext, bracket: PlayoffBracket,
): void {
	if (!activeEngine) {
		return;
	}

	const round = bracket.getCurrentRound();
	if (!round) {
		// Playoffs complete
		const champion = bracket.getChampion();
		const playerTeamId = activeEngine.season.playerTeamId;
		if (champion === playerTeamId) {
			ctx.addHeadline('CHAMPIONS!');
			ctx.addText(`${player.teamName} wins the championship!`);
			player.careerHistory.length > 0 &&
				player.careerHistory[player.careerHistory.length - 1]?.awards?.push('Champion');
		} else {
			ctx.addText('Your playoff run is over.');
		}
		finalizeSeason(player, ctx);
		return;
	}

	ctx.addHeadline(round.roundName);

	const playerGame = bracket.getPlayerMatchup();
	if (!playerGame) {
		// Player was eliminated or has a bye -- simulate other games and advance
		simulateNonPlayerPlayoffGames(bracket);
		bracket.advanceRound();
		startPlayoffs(player, ctx, bracket);
		return;
	}

	// Show the matchup
	const opponentId = playerGame.getOpponentId(bracket.playerTeamId);
	const opponent = opponentId ? activeEngine.season.getTeam(opponentId) : undefined;
	const opponentName = opponent ? opponent.getDisplayName() : 'Unknown';
	ctx.addText(`Playoff matchup: ${player.teamName} vs ${opponentName}`);

	ctx.showChoices([{
		text: 'Play Game',
		primary: true,
		action: () => {
			if (!activeEngine) {
				return;
			}
			// Simulate the player's playoff game
			const opponentStrength = opponent ? opponent.strength : 50;
			const team = {
				teamName: player.teamName,
				strength: player.teamStrength,
				wins: 0,
				losses: 0,
				schedule: [],
				coachPersonality: 'supportive' as const,
			};

			const gameResult = simulateGame(player, team, opponentStrength, true);

			// Record result
			if (playerGame.homeTeamId === bracket.playerTeamId) {
				bracket.recordResult(playerGame.id, gameResult.teamScore, gameResult.opponentScore);
			} else {
				bracket.recordResult(playerGame.id, gameResult.opponentScore, gameResult.teamScore);
			}

			// Accumulate stats
			accumulateGameStats(player.seasonStats, gameResult.playerStatLine);

			// Show result
			ctx.addHeadline(
				`${player.teamName} ${gameResult.teamScore} - ${opponentName} ${gameResult.opponentScore}`
			);
			ctx.addText(gameResult.storyText);

			// Simulate other playoff games this round
			simulateNonPlayerPlayoffGames(bracket);

			// Check if eliminated
			if (bracket.isEliminated(bracket.playerTeamId)) {
				ctx.addText('Season over. Eliminated from the playoffs.');
				finalizeSeason(player, ctx);
				return;
			}

			// Advance to next round
			bracket.advanceRound();

			ctx.showChoices([{
				text: 'Next Round',
				primary: true,
				action: () => startPlayoffs(player, ctx, bracket),
			}]);
		},
	}]);
}

//============================================
// Simulate non-player playoff games in the current round
function simulateNonPlayerPlayoffGames(bracket: PlayoffBracket): void {
	const round = bracket.getCurrentRound();
	if (!round) {
		return;
	}
	for (const game of round.games) {
		if (game.status === 'final') {
			continue;
		}
		if (game.involvesTeam(bracket.playerTeamId)) {
			continue;
		}
		// Use default strengths for non-player teams
		bracket.simulatePlayoffGame(game, 60, 55);
	}
}

//============================================
// Finalize the season: save to career history and call handler callback
function finalizeSeason(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}

	const record = activeEngine.season.getPlayerRecord();

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
		awards: [],
		statTotals: { ...player.seasonStats },
	});

	ctx.save();

	// Call the handler's season-end callback
	const callback = activeEngine.onSeasonEnd;
	activeEngine = null;
	callback();
}

//============================================
// Refresh activities tab (called by tab switch handler)
export function refreshActivitiesForCurrentSeason(player: Player): void {
	if (!activeEngine) {
		return;
	}
	const activities = getActivitiesForPhase(player.phase, player);
	ui.renderActivitiesTab(
		activities,
		activeEngine.weekState,
		(activity: Activity) => isActivityUnlocked(activity, player),
		(activity: Activity) => getEffectPreview(activity),
		// Activity selection during tab browse is a no-op if no active season
		() => {},
	);
}

//============================================
// Check if a season is currently active
export function isSeasonActive(): boolean {
	return activeEngine !== null;
}

//============================================
// Get current season record (for UI display)
export function getSeasonRecord(): { wins: number; losses: number } | null {
	if (!activeEngine) {
		return null;
	}
	const record = activeEngine.season.getPlayerRecord();
	return { wins: record.wins, losses: record.losses };
}

//============================================
// Get the active LeagueSeason (for tab switch standings display)
export function getActiveSeason(): LeagueSeason | null {
	if (!activeEngine) {
		return null;
	}
	return activeEngine.season;
}
