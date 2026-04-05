// game_loop.ts - shared weekly game loop engine used by all football phases
//
// The weekly rhythm is identical across HS, college, and NFL:
//   focus -> activities prompt -> event check -> game day -> results
//
// Phase modules call these shared functions and provide callbacks for
// phase-specific behavior (which game to play, which events to show).

import { Player, CareerPhase, randomInRange } from './player.js';
import {
	GameEvent, filterEvents, selectEvent, applyEventChoice,
} from './events.js';
import { WeeklyFocus, applySeasonGoal, applyWeeklyFocus } from './week_sim.js';
import {
	Activity, WeekState, createWeekState, canDoActivity,
	getActivitiesForPhase, isActivityUnlocked, applyActivity, getEffectPreview, formatActivityResult,
} from './activities.js';
import { switchTab, hideTabBar, showTabBar } from './tabs.js';
import * as ui from './ui.js';

//============================================
// GameContext: main.ts provides this so phase modules can access shared
// state without importing main.ts (avoids circular deps)
export interface GameContext {
	// Player access
	getPlayer(): Player;
	// Event pool
	getAllEvents(): GameEvent[];
	// Persistence
	save(): void;
	// Story helpers (main.ts has BitLife-style divider wrappers)
	clearStory(): void;
	addHeadline(text: string): void;
	addText(text: string): void;
	addResult(text: string): void;
}

// Module-level context set once by main.ts at init
let ctx: GameContext | null = null;
let currentOnGameDay: (() => void) | null = null;

//============================================
// Initialize the game loop engine with context from main.ts
export function initGameLoop(context: GameContext): void {
	ctx = context;
}

//============================================
// WEEK STATE MANAGEMENT
//============================================

// Transient weekly state (not on Player)
let currentWeekState: WeekState = createWeekState();

//============================================
export function resetWeekState(): void {
	currentWeekState = createWeekState();
}

//============================================
export function getWeekState(): WeekState {
	return currentWeekState;
}

//============================================
// WEEKLY FOCUS UI (consolidated from 3 duplicates)
//============================================

// Show the 5 weekly focus options. College gets "Social / NIL" label.
export function showWeeklyFocusUI(
	phase: CareerPhase,
	onFocusSelected: (focus: WeeklyFocus) => void,
): void {
	// Social label varies by phase
	const socialLabel = phase === 'college' ? 'Social / NIL' : 'Social';

	const focusOptions: { text: string; key: WeeklyFocus }[] = [
		{ text: 'Train (+2-4 TEC)', key: 'train' },
		{ text: 'Film Study (+2-3 IQ)', key: 'film_study' },
		{ text: 'Recovery (+3-5 HP)', key: 'recovery' },
		{ text: `${socialLabel} (+2-4 POP)`, key: 'social' },
		{ text: 'Teamwork (+2-3 leadership)', key: 'teamwork' },
	];

	ui.waitForInteraction('Weekly Focus', focusOptions.map(opt => ({
		text: opt.text,
		primary: false,
		action: () => onFocusSelected(opt.key),
	})), 'What do you want to focus on this week?');
}

//============================================
// HANDLE WEEKLY FOCUS (consolidated from 3 duplicates)
//============================================

// Apply season goal effects, then show activities prompt.
// extraLogic runs after goal is applied (e.g., college NIL deal check).
// The focus parameter is ignored (kept for backward compat with callers).
export function handleWeeklyFocus(
	phase: CareerPhase,
	focus: WeeklyFocus,
	onGameDay: () => void,
	extraLogic?: () => void,
): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	// Apply season goal effects (focus arg is ignored)
	const goalStory = applySeasonGoal(player);
	ctx.addText(goalStory);
	ui.updateAllStats(player);
	ctx.save();

	// Run any phase-specific extra logic (e.g., college NIL check)
	if (extraLogic) {
		extraLogic();
	}

	// Advance to activities prompt
	currentWeekState.phase = 'activity_prompt';
	showActivitiesPrompt(phase, onGameDay);
}

// Skip the focus popup and apply the season goal directly.
// Callers use this instead of showWeeklyFocusUI + handleWeeklyFocus.
export function applyGoalAndProceed(
	phase: CareerPhase,
	onGameDay: () => void,
	extraLogic?: () => void,
): void {
	handleWeeklyFocus(phase, 'train', onGameDay, extraLogic);
}

//============================================
// ACTIVITIES FLOW
//============================================

// Show activities prompt: player can visit Activities tab or skip to game day
function showActivitiesPrompt(
	phase: CareerPhase,
	onGameDay: () => void,
): void {
	if (!ctx) {
		return;
	}

	currentOnGameDay = onGameDay;

	ui.waitForInteraction('Free Time', [
		{
			text: 'Activities',
			primary: false,
			action: () => {
				// Switch to Activities tab and refresh its content
				refreshActivitiesTab(phase, onGameDay);
				switchTab('activities');
			},
		},
		{
			text: 'Skip to Game Day',
			primary: true,
			action: () => {
				// Skip activities, proceed to event check
				currentWeekState.phase = 'activity_done';
				proceedToEventCheck(phase, onGameDay);
			},
		},
	], 'You have some free time this week.');
}

//============================================
// Refresh the Activities tab with current data
function refreshActivitiesTab(
	phase: CareerPhase,
	onGameDay: () => void,
): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();
	currentOnGameDay = onGameDay;

	const activities = getActivitiesForPhase(player.phase, player);

	ui.renderActivitiesTab(
		activities,
		currentWeekState,
		(activity: Activity) => isActivityUnlocked(activity, player),
		(activity: Activity) => getEffectPreview(activity),
		(activity: Activity) => handleActivitySelection(activity, phase, onGameDay),
	);
}

//============================================
// Handle when player selects an activity from the hub
function handleActivitySelection(
	activity: Activity,
	phase: CareerPhase,
	onGameDay: () => void,
): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	// Apply the activity effects
	const result = applyActivity(activity, player);
	currentWeekState.actionsUsed += 1;

	// Update stats display
	ui.updateAllStats(player);
	ctx.save();

	// Append result to story log (story-first: results go to Life tab)
	ctx.addText(result.flavorText);
	const appliedText = formatActivityResult(result);
	if (appliedText.length > 0) {
		ui.addStatChange(appliedText);
	}

	// Mark activity phase as done
	currentWeekState.phase = 'activity_done';

	// Switch back to Life tab and continue to event check
	switchTab('life');
	proceedToEventCheck(phase, onGameDay);
}

//============================================
// EVENT CHECK AND ROUTING
//============================================

// Proceed to random event check, then game day
export function proceedToEventCheck(
	phase: CareerPhase,
	onGameDay: () => void,
): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();
	const allEvents = ctx.getAllEvents();

	currentWeekState.phase = 'event';

	// Event chance varies by phase
	const eventChance = phase === 'college' ? 30 : 35;
	const eventRoll = randomInRange(1, 100);

	if (eventRoll <= eventChance && allEvents.length > 0) {
		// Build stats record for filtering
		const statsRecord: Record<string, number> = {
			athleticism: player.core.athleticism,
			technique: player.core.technique,
			footballIq: player.core.footballIq,
			discipline: player.core.discipline,
			health: player.core.health,
			confidence: player.core.confidence,
		};

		// Try phase-specific events only (do not fall back to other phases)
			let eligible = filterEvents(
				allEvents, phase,
				player.currentWeek, player.position,
				player.storyFlags, statsRecord, player.collegeYear,
			);

		const event = selectEvent(eligible);
		if (event) {
			showEventCard(event, onGameDay);
			return;
		}
	}

	// No event: go straight to game day
	currentWeekState.phase = 'game';
	onGameDay();
}

//============================================
// EVENT CARD (consolidated from 3 duplicates)
//============================================

// Show event modal. After choice, proceeds to game day via callback.
function showEventCard(
	event: GameEvent,
	onGameDay: () => void,
): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();

	// Hide tab bar during event modal
	hideTabBar();

	const choiceActions = event.choices.map(choice => ({
		text: choice.text,
		action: () => {
			// Apply choice effects
			const flavor = applyEventChoice(player, choice);
			// Restore tab bar after modal closes
			showTabBar();

			ctx!.addHeadline(event.title);
			ctx!.addText(flavor);
			ui.updateAllStats(player);
			ctx!.save();

			// Continue to game day - this is a simple navigation, keep inline
			ui.showChoices([
				{ text: 'Game Day', primary: true, action: onGameDay },
			]);
		},
	}));

	ui.waitForInteraction(event.title, choiceActions, event.description, 'narrative');
}

//============================================
// SILENT WEEK SIMULATION (for year-sim / Age Up)
//============================================

// Result from a single silently simulated week
export interface SilentWeekResult {
	goalApplied: string;
	eventTitle: string | null;
	eventChoiceText: string | null;
}

// Simulate the focus + event portion of a week without any UI.
// Returns what happened so the caller can build a recap.
// The caller is responsible for game-day simulation (phase-specific).
export function simulateWeekSilently(): SilentWeekResult {
	if (!ctx) {
		return { goalApplied: 'grind', eventTitle: null, eventChoiceText: null };
	}
	const player = ctx.getPlayer();

	// Reset weekly state
	resetWeekState();

	// Apply the player's season goal effects
	applySeasonGoal(player);

	// Event check (same logic as proceedToEventCheck but silent)
	let eventTitle: string | null = null;
	let eventChoiceText: string | null = null;

	const allEvents = ctx.getAllEvents();
	const eventChance = player.phase === 'college' ? 30 : 35;
	const eventRoll = randomInRange(1, 100);

	if (eventRoll <= eventChance && allEvents.length > 0) {
		const statsRecord: Record<string, number> = {
			athleticism: player.core.athleticism,
			technique: player.core.technique,
			footballIq: player.core.footballIq,
			discipline: player.core.discipline,
			health: player.core.health,
			confidence: player.core.confidence,
		};

			let eligible = filterEvents(
				allEvents, player.phase,
				player.currentWeek, player.position,
				player.storyFlags, statsRecord, player.collegeYear,
			);

		if (eligible.length === 0 && (player.phase === 'nfl' || player.phase === 'college')) {
				eligible = filterEvents(
					allEvents, 'high_school',
					player.currentWeek, player.position,
					player.storyFlags, statsRecord, player.collegeYear,
				);
			}

		const event = selectEvent(eligible);
		if (event && event.choices.length > 0) {
			// Auto-pick first choice (safest option)
			eventTitle = event.title;
			eventChoiceText = event.choices[0].text;
			applyEventChoice(player, event.choices[0]);
		}
	}

	ctx.save();
	return { goalApplied: player.seasonGoal, eventTitle, eventChoiceText };
}

//============================================
// YEAR SIMULATION RECAP
//============================================

export interface YearSimRecap {
	weeksSimulated: number;
	wins: number;
	losses: number;
	events: string[];
}

// Show the year-end recap as a popup modal
export function showYearRecap(recap: YearSimRecap, onContinue: () => void): void {
	// Build recap text
	let desc = `Simulated ${recap.weeksSimulated} weeks.\n`;
	desc += `Season record: ${recap.wins}-${recap.losses}\n`;
	if (recap.events.length > 0) {
		desc += '\nNotable events:\n';
		for (const ev of recap.events) {
			desc += `- ${ev}\n`;
		}
	}

	ui.showChoices([
		{
			text: 'Continue',
			primary: true,
			action: onContinue,
		},
	]);
}

//============================================
// TAB CONTENT REFRESH
// Called by handleTabSwitch in main.ts when Activities tab is opened
//============================================

export function refreshActivitiesTabForCurrentPhase(): void {
	if (!ctx) {
		return;
	}
	const player = ctx.getPlayer();
	const activities = getActivitiesForPhase(player.phase, player);

	ui.renderActivitiesTab(
		activities,
		currentWeekState,
		(activity: Activity) => isActivityUnlocked(activity, player),
		(activity: Activity) => getEffectPreview(activity),
		(activity: Activity) => {
			if (!currentOnGameDay) {
				return;
			}
			handleActivitySelection(activity, player.phase, currentOnGameDay);
		},
	);
}
