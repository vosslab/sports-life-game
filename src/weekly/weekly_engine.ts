// weekly_engine.ts - shared weekly loop with guaranteed advancement
//
// CONTRACT: every call to runSeasonWeek() must end in exactly one of:
//   - { kind: "next_week", nextWeek: N }
//   - { kind: "season_ended" }
//
// No third state. No conditional path that silently returns without advancing.
// Handlers call startSeason() then the engine drives the weekly loop.

import { Player, CareerPhase, randomInRange, createEmptySeasonStats } from '../player.js';
import { CareerContext, SeasonConfig, WeekAdvanceResult } from '../core/year_handler.js';
import { WeeklyFocus, applyWeeklyFocus, simulateGame, evaluateDepthChartUpdate } from '../week_sim.js';
import { Team, ScheduleEntry } from '../team.js';
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

//============================================
// Season state: managed by the engine, not on Player
interface SeasonState {
	config: SeasonConfig;
	schedule: ScheduleEntry[];
	wins: number;
	losses: number;
	weekState: WeekState;
	onSeasonEnd: () => void;
}

// Current active season (null when no season running)
let activeSeason: SeasonState | null = null;

//============================================
// Start a new season. Engine takes over the weekly loop.
export function startSeason(
	player: Player,
	ctx: CareerContext,
	config: SeasonConfig,
	schedule: ScheduleEntry[],
	onSeasonEnd: () => void,
): void {
	// Reset season tracking
	player.currentWeek = 0;
	player.seasonStats = createEmptySeasonStats();
	player.currentSeason += 1;

	activeSeason = {
		config,
		schedule,
		wins: 0,
		losses: 0,
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
	if (!activeSeason) {
		return;
	}

	player.currentWeek += 1;
	const weekNum = player.currentWeek;
	const seasonLen = activeSeason.config.seasonLength;

	// Check if season is over
	if (weekNum > seasonLen) {
		endSeason(player, ctx);
		return;
	}

	// Reset weekly state
	activeSeason.weekState = createWeekState();
	activeSeason.weekState.phase = 'focus';

	// Update header and show week intro
	ctx.updateHeader(player);
	ctx.clearStory();
	ctx.addHeadline(`Week ${weekNum}`);

	// Show the opponent for this week
	const entry = activeSeason.schedule[weekNum - 1];
	if (entry) {
		ctx.addText(`This week: vs ${entry.opponentName}`);
	}

	// Show weekly focus choices
	showFocusChoices(player, ctx);
}

//============================================
// Phase 1: Weekly focus selection
function showFocusChoices(player: Player, ctx: CareerContext): void {
	const socialLabel = player.phase === 'college' ? 'Social / NIL' : 'Social';

	const focusOptions: { text: string; key: WeeklyFocus }[] = [
		{ text: 'Train (+2-4 TEC)', key: 'train' },
		{ text: 'Film Study (+2-3 IQ)', key: 'film_study' },
		{ text: 'Recovery (+3-5 HP)', key: 'recovery' },
		{ text: `${socialLabel} (+2-4 POP)`, key: 'social' },
		{ text: 'Teamwork (+2-3 leadership)', key: 'teamwork' },
	];

	ctx.showChoices(focusOptions.map(opt => ({
		text: opt.text,
		primary: false,
		action: () => handleFocusSelected(player, ctx, opt.key),
	})));
}

//============================================
// Phase 2: Apply focus, show activities prompt
function handleFocusSelected(
	player: Player, ctx: CareerContext, focus: WeeklyFocus,
): void {
	// Apply focus effects
	const focusStory = applyWeeklyFocus(player, focus);
	ctx.addText(focusStory);
	ctx.updateStats(player);
	ctx.save();

	if (!activeSeason) {
		return;
	}
	activeSeason.weekState.phase = 'activity_prompt';

	// Show activities prompt
	ctx.addText('You have some free time this week.');
	ctx.showChoices([
		{
			text: 'Activities',
			primary: false,
			action: () => {
				showActivities(player, ctx);
				switchTab('activities');
			},
		},
		{
			text: 'Skip to Game Day',
			primary: true,
			action: () => {
				if (activeSeason) {
					activeSeason.weekState.phase = 'activity_done';
				}
				proceedToEventCheck(player, ctx);
			},
		},
	]);
}

//============================================
// Show activities in the Activities tab
function showActivities(player: Player, ctx: CareerContext): void {
	const activities = getActivitiesForPhase(player.phase, player);

	ui.renderActivitiesTab(
		activities,
		activeSeason ? activeSeason.weekState : createWeekState(),
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

	if (activeSeason) {
		activeSeason.weekState.actionsUsed += 1;
		activeSeason.weekState.phase = 'activity_done';
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
	if (!activeSeason) {
		return;
	}
	activeSeason.weekState.phase = 'event';

	const eventChance = activeSeason.config.eventChance;
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
	if (!activeSeason) {
		return;
	}
	activeSeason.weekState.phase = 'game';

	const weekIdx = player.currentWeek - 1;
	const entry = activeSeason.schedule[weekIdx];
	if (!entry) {
		// No game scheduled, advance to next week
		advanceToNextWeek(player, ctx);
		return;
	}

	// Build a minimal Team object for simulation
	const team: Team = {
		teamName: player.teamName,
		strength: player.teamStrength,
		wins: activeSeason.wins,
		losses: activeSeason.losses,
		schedule: activeSeason.schedule,
		coachPersonality: 'supportive',
	};

	// Simulate the game
	const gameResult = simulateGame(
		player, team, entry.opponentStrength,
	);

	// Update schedule entry
	entry.played = true;
	entry.teamScore = gameResult.teamScore;
	entry.opponentScore = gameResult.opponentScore;

	// Update season record
	if (gameResult.result === 'win') {
		activeSeason.wins += 1;
	} else {
		activeSeason.losses += 1;
	}

	// Accumulate stats
	accumulateGameStats(player.seasonStats, gameResult.playerStatLine);

	// Evaluate depth chart
	const depthUpdate = evaluateDepthChartUpdate(player, gameResult.playerGrade);
	if (depthUpdate.changed) {
		player.depthChart = depthUpdate.newStatus;
	}

	// Show game story
	ctx.addHeadline(
		`${player.teamName} ${gameResult.teamScore} - `
		+ `${entry.opponentName} ${gameResult.opponentScore}`
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

	// Show "Next Week" button - this is the ONLY path forward
	ctx.showChoices([{
		text: player.currentWeek >= activeSeason.config.seasonLength
			? 'End of Season' : 'Next Week',
		primary: true,
		action: () => advanceToNextWeek(player, ctx),
	}]);
}

//============================================
// End the season
function endSeason(player: Player, ctx: CareerContext): void {
	if (!activeSeason) {
		return;
	}

	ctx.clearStory();
	ctx.addHeadline('Season Complete');
	ctx.addText(
		`Final record: ${activeSeason.wins}-${activeSeason.losses}`
	);

	// Save season to career history
	player.careerHistory.push({
		phase: player.phase,
		year: player.currentSeason,
		age: player.age,
		team: player.teamName,
		position: player.position,
		wins: activeSeason.wins,
		losses: activeSeason.losses,
		depthChart: player.depthChart,
		highlights: [],
		awards: [],
		statTotals: { ...player.seasonStats },
	});

	ctx.save();

	// Call the handler's season-end callback
	const callback = activeSeason.onSeasonEnd;
	activeSeason = null;
	callback();
}

//============================================
// Refresh activities tab (called by tab switch handler)
export function refreshActivitiesForCurrentSeason(player: Player): void {
	if (!activeSeason) {
		return;
	}
	const activities = getActivitiesForPhase(player.phase, player);
	ui.renderActivitiesTab(
		activities,
		activeSeason.weekState,
		(activity: Activity) => isActivityUnlocked(activity, player),
		(activity: Activity) => getEffectPreview(activity),
		// Activity selection during tab browse is a no-op if no active season
		() => {},
	);
}

//============================================
// Check if a season is currently active
export function isSeasonActive(): boolean {
	return activeSeason !== null;
}

//============================================
// Get current season state (for UI display)
export function getSeasonRecord(): { wins: number; losses: number } | null {
	if (!activeSeason) {
		return null;
	}
	return { wins: activeSeason.wins, losses: activeSeason.losses };
}
